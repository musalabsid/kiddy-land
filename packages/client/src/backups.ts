import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useClient } from "./client-context";
export type BackupRecord = { id: string; createdAt: number; appVersion: string; schemaVersion: number; sizeBytes: number; destination: string; status: "verified" | "failed"; error?: string };
export function useBackups() { const client = useClient(); return useQuery({ queryKey: ["backups"], queryFn: () => client.get<{ backups: BackupRecord[]; health: unknown }>("/backups") }); }
export function useBackupNow() { const client = useClient(); const query = useQueryClient(); return useMutation({ mutationFn: () => client.post<BackupRecord>("/backups", {}), onSuccess: () => void query.invalidateQueries({ queryKey: ["backups"] }) }); }
export function useStageRestoreBackup() { const client = useClient(); return useMutation({ mutationFn: ({ id, confirmation }: { id: string; confirmation: string }) => client.post(`/backups/${id}/restore/stage`, { confirmation }) }); }
export function useRestoreBackup() { const client = useClient(); const query = useQueryClient(); return useMutation({ mutationFn: ({ id, confirmation }: { id: string; confirmation: string }) => client.post(`/backups/${id}/restore`, { confirmation }), onSuccess: () => void query.invalidateQueries({ queryKey: ["backups"] }) }); }
export function useDeleteBackup() { const client = useClient(); const query = useQueryClient(); return useMutation({ mutationFn: (id: string) => client.delete(`/backups/${id}`), onSuccess: () => void query.invalidateQueries({ queryKey: ["backups"] }) }); }
