{/* عرض السجل الزمني (Timeline) إن وجد */}
{o.timeline && o.timeline.length > 0 && (
  <div className="space-y-2 border-t hairline pt-3">
    <span className="text-xs font-semibold muted block">سجل التحديثات:</span>
    <div className="space-y-2 max-h-40 overflow-y-auto text-xs">
      {o.timeline.map((t: any, idx: number) => (
        <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-muted/20 border border-border/40">
          <div>
            <span className="font-bold text-[var(--gold)]">{t.status}</span>
            {t.note && <span className="muted block mt-0.5">{t.note}</span>}
          </div>
          <span className="muted text-[11px]" dir="ltr">
            {new Date(t.createdAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
          </span>
        </div>
      ))}
    </div>
  </div>
)}
