export const PlaceholderTab = ({ title, note }: { title: string; note: string }) => (
  <div className="pane">
    <div className="placeholder">
      <h3>{title}</h3>
      <p className="hint">{note}</p>
    </div>
  </div>
);
