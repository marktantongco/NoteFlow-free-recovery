import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, AuditLog } from '../../lib/db';
import { format } from 'date-fns';
import { useWebSocket } from '../../hooks/useWebSocket';

export const AuditLogView = ({ targetId }: { targetId: string }) => {
  const { lastMessage } = useWebSocket('audit-room');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  
  const liveLogs = useLiveQuery(() => db.auditLogs.where('targetId').equals(targetId).sortBy('timestamp'), [targetId]);

  useEffect(() => {
    if (liveLogs) setLogs(liveLogs);
  }, [liveLogs]);

  useEffect(() => {
    if (lastMessage?.type === 'audit_update' && lastMessage.targetId === targetId) {
        // Refresh logs from DB (simple approach) or prepend new item
        // In this demo, we'll just re-fetch for simplicity
        db.auditLogs.where('targetId').equals(targetId).sortBy('timestamp').then(setLogs);
    }
  }, [lastMessage, targetId]);

  return (
    <div className="text-xs text-neutral-500 space-y-1">
        <h4 className="font-semibold text-neutral-700">Audit History (Live)</h4>
      {logs.map(log => (
        <div key={log.id} className="flex justify-between">
          <span>{log.action}</span>
          <span className="font-mono">{format(new Date(log.timestamp), 'MMM dd, HH:mm')}</span>
        </div>
      ))}
    </div>
  );
};
