import {
  isAllowedLinkPair,
  type EntityLinkKind,
  type EntityLinkTarget,
} from "@helvety-cloud/api-contract";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@helvety-cloud/db";

type Db = SupabaseClient<Database>;

function dedupeLinkTargets(
  links: EntityLinkTarget[],
): EntityLinkTarget[] {
  const seen = new Set<string>();
  const out: EntityLinkTarget[] = [];
  for (const link of links) {
    const key = `${link.kind}:${link.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(link);
  }
  return out;
}

/** Validate that each target id exists in the workspace. */
export async function validateLinkTargetsInWorkspace(
  supabase: Db,
  workspaceId: string,
  sourceKind: EntityLinkKind,
  links: EntityLinkTarget[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  for (const link of links) {
    if (!isAllowedLinkPair(sourceKind, link.kind)) {
      return {
        ok: false,
        message: `${sourceKind} cannot link to ${link.kind}`,
      };
    }
    switch (link.kind) {
      case "note": {
        const { data, error } = await supabase
          .from("notes")
          .select("id")
          .eq("id", link.id)
          .eq("workspace_id", workspaceId)
          .maybeSingle();
        if (error) return { ok: false, message: error.message };
        if (!data) return { ok: false, message: `note ${link.id} not in workspace` };
        break;
      }
      case "contact": {
        const { data, error } = await supabase
          .from("contacts")
          .select("id")
          .eq("id", link.id)
          .eq("workspace_id", workspaceId)
          .maybeSingle();
        if (error) return { ok: false, message: error.message };
        if (!data)
          return { ok: false, message: `contact ${link.id} not in workspace` };
        break;
      }
      case "project": {
        const { data, error } = await supabase
          .from("projects")
          .select("id")
          .eq("id", link.id)
          .eq("workspace_id", workspaceId)
          .maybeSingle();
        if (error) return { ok: false, message: error.message };
        if (!data)
          return { ok: false, message: `project ${link.id} not in workspace` };
        break;
      }
      case "task": {
        const { data: task, error } = await supabase
          .from("tasks")
          .select("id, project_id")
          .eq("id", link.id)
          .maybeSingle();
        if (error) return { ok: false, message: error.message };
        if (!task) return { ok: false, message: `task ${link.id} not found` };
        const { data: project, error: projectError } = await supabase
          .from("projects")
          .select("id")
          .eq("id", task.project_id)
          .eq("workspace_id", workspaceId)
          .maybeSingle();
        if (projectError) return { ok: false, message: projectError.message };
        if (!project)
          return { ok: false, message: `task ${link.id} not in workspace` };
        break;
      }
      default: {
        const _exhaustive: never = link.kind;
        return { ok: false, message: `unknown kind ${_exhaustive}` };
      }
    }
  }
  return { ok: true };
}

export async function listOutgoingLinks(
  supabase: Db,
  workspaceId: string,
  sourceKind: EntityLinkKind,
  sourceId: string,
): Promise<EntityLinkTarget[]> {
  const { data, error } = await supabase
    .from("entity_links")
    .select("target_kind, target_id")
    .eq("workspace_id", workspaceId)
    .eq("source_kind", sourceKind)
    .eq("source_id", sourceId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    kind: row.target_kind as EntityLinkKind,
    id: row.target_id,
  }));
}

export async function listOutgoingLinksForSources(
  supabase: Db,
  workspaceId: string,
  sourceKind: EntityLinkKind,
  sourceIds: string[],
): Promise<Map<string, EntityLinkTarget[]>> {
  const map = new Map<string, EntityLinkTarget[]>();
  for (const id of sourceIds) map.set(id, []);
  if (sourceIds.length === 0) return map;

  const { data, error } = await supabase
    .from("entity_links")
    .select("source_id, target_kind, target_id")
    .eq("workspace_id", workspaceId)
    .eq("source_kind", sourceKind)
    .in("source_id", sourceIds);
  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    const list = map.get(row.source_id) ?? [];
    list.push({
      kind: row.target_kind as EntityLinkKind,
      id: row.target_id,
    });
    map.set(row.source_id, list);
  }
  return map;
}

/** Replace non-project outgoing edges; project affiliations are preserved. */
export async function replaceOutgoingLinks(
  supabase: Db,
  workspaceId: string,
  sourceKind: EntityLinkKind,
  sourceId: string,
  targets: EntityLinkTarget[],
): Promise<EntityLinkTarget[]> {
  const deduped = dedupeLinkTargets(targets).filter(
    (t) =>
      t.kind !== "project" &&
      !(t.kind === sourceKind && t.id === sourceId),
  );

  const { error: deleteError } = await supabase
    .from("entity_links")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("source_kind", sourceKind)
    .eq("source_id", sourceId)
    .neq("target_kind", "project");
  if (deleteError) throw new Error(deleteError.message);

  if (deduped.length > 0) {
    const rows = deduped.map((t) => ({
      workspace_id: workspaceId,
      source_kind: sourceKind,
      source_id: sourceId,
      target_kind: t.kind,
      target_id: t.id,
    }));
    const { error: insertError } = await supabase
      .from("entity_links")
      .insert(rows);
    if (insertError) throw new Error(insertError.message);
  }

  return listOutgoingLinks(supabase, workspaceId, sourceKind, sourceId);
}

/** Replace project affiliation edges only (0..n projects). */
export async function replaceProjectLinks(
  supabase: Db,
  workspaceId: string,
  sourceKind: EntityLinkKind,
  sourceId: string,
  projectIds: string[],
): Promise<EntityLinkTarget[]> {
  if (!isAllowedLinkPair(sourceKind, "project")) {
    throw new Error(`${sourceKind} cannot link to project`);
  }

  const seen = new Set<string>();
  const deduped: EntityLinkTarget[] = [];
  for (const id of projectIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    deduped.push({ kind: "project", id });
  }

  const { error: deleteError } = await supabase
    .from("entity_links")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("source_kind", sourceKind)
    .eq("source_id", sourceId)
    .eq("target_kind", "project");
  if (deleteError) throw new Error(deleteError.message);

  if (deduped.length > 0) {
    const rows = deduped.map((t) => ({
      workspace_id: workspaceId,
      source_kind: sourceKind,
      source_id: sourceId,
      target_kind: t.kind,
      target_id: t.id,
    }));
    const { error: insertError } = await supabase
      .from("entity_links")
      .insert(rows);
    if (insertError) throw new Error(insertError.message);
  }

  return listOutgoingLinks(supabase, workspaceId, sourceKind, sourceId);
}

/** Delete all entity_links where this entity is source or target. */
export async function deleteLinksTouching(
  supabase: Db,
  workspaceId: string,
  kind: EntityLinkKind,
  id: string,
): Promise<void> {
  const { error: asSource } = await supabase
    .from("entity_links")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("source_kind", kind)
    .eq("source_id", id);
  if (asSource) throw new Error(asSource.message);

  const { error: asTarget } = await supabase
    .from("entity_links")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("target_kind", kind)
    .eq("target_id", id);
  if (asTarget) throw new Error(asTarget.message);
}

export async function findNoteIdsLinkedToTask(
  supabase: Db,
  workspaceId: string,
  taskId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("entity_links")
    .select("source_id")
    .eq("workspace_id", workspaceId)
    .eq("source_kind", "note")
    .eq("target_kind", "task")
    .eq("target_id", taskId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.source_id);
}

export async function findNoteIdsLinkedToProject(
  supabase: Db,
  workspaceId: string,
  projectId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("entity_links")
    .select("source_id")
    .eq("workspace_id", workspaceId)
    .eq("source_kind", "note")
    .eq("target_kind", "project")
    .eq("target_id", projectId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.source_id);
}
