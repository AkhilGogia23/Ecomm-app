"use client";

import { useCallback, useEffect, useState } from "react";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import Pagination from "@/components/ui/Pagination";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/lib/constants";

interface AuditLogRow {
  id: string;
  userName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  previousData: string | null;
  newData: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [detailTarget, setDetailTarget] = useState<AuditLogRow | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (action) params.set("action", action);
      if (entity) params.set("entity", entity);
      const res = await fetch(`/api/admin/audit-log?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.data);
        setTotalPages(json.meta?.totalPages ?? 1);
        setTotal(json.meta?.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [page, action, entity]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on filter change
    fetchLogs();
  }, [fetchLogs]);

  const columns: Column<AuditLogRow>[] = [
    { key: "date", header: "Timestamp", render: (row) => new Date(row.createdAt).toLocaleString() },
    { key: "user", header: "User", render: (row) => row.userName ?? "System" },
    { key: "action", header: "Action", render: (row) => row.action },
    { key: "entity", header: "Entity", render: (row) => row.entity },
    { key: "entityId", header: "Entity ID", render: (row) => row.entityId ?? "—" },
    { key: "ip", header: "IP Address", render: (row) => row.ipAddress ?? "—" },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <button onClick={() => setDetailTarget(row)} className="text-xs text-blue-600 hover:underline dark:text-blue-400">
          View diff
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Audit Log</h1>
        <p className="text-sm text-gray-500 dark:text-neutral-400">{total} recorded actions</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
        <Select value={action} onChange={(e) => setAction(e.target.value)} placeholder="All actions" options={Object.values(AUDIT_ACTIONS).map((a) => ({ label: a, value: a }))} className="w-40" />
        <Select value={entity} onChange={(e) => setEntity(e.target.value)} placeholder="All entities" options={Object.values(AUDIT_ENTITIES).map((e) => ({ label: e, value: e }))} className="w-40" />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <DataTable columns={columns} data={logs} rowKey={(row) => row.id} loading={loading} emptyTitle="No audit log entries" />
        <Pagination page={page} totalPages={totalPages} total={total} limit={50} onPageChange={setPage} />
      </div>

      <Modal open={!!detailTarget} onClose={() => setDetailTarget(null)} title="Change Details" size="lg">
        {detailTarget && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="mb-1 text-xs font-medium text-gray-500 dark:text-neutral-400">Previous Data</p>
              <pre className="overflow-x-auto rounded-md bg-gray-50 p-3 text-xs dark:bg-neutral-800">
                {detailTarget.previousData ? JSON.stringify(JSON.parse(detailTarget.previousData), null, 2) : "—"}
              </pre>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-gray-500 dark:text-neutral-400">New Data</p>
              <pre className="overflow-x-auto rounded-md bg-gray-50 p-3 text-xs dark:bg-neutral-800">
                {detailTarget.newData ? JSON.stringify(JSON.parse(detailTarget.newData), null, 2) : "—"}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
