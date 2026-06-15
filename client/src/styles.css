:root {
  color-scheme: light;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #172033;
  background: #f6f7fb;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
}

* {
  box-sizing: border-box;
}

body {
  min-width: 320px;
  min-height: 100vh;
  margin: 0;
}

button,
input {
  font: inherit;
}

button {
  border: 0;
}

.app-shell {
  min-height: 100vh;
  padding: 28px;
  background:
    linear-gradient(115deg, rgba(29, 78, 216, 0.09), transparent 34%),
    linear-gradient(240deg, rgba(20, 184, 166, 0.12), transparent 38%),
    #f6f7fb;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  max-width: 1180px;
  margin: 0 auto 24px;
}

.eyebrow {
  margin: 0 0 6px;
  color: #24736f;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  color: #101828;
  font-size: clamp(2rem, 4vw, 3.45rem);
  line-height: 1;
}

h2 {
  color: #101828;
  font-size: 1.35rem;
  line-height: 1.2;
}

.topbar-status,
.mode-badge,
.primary-button,
.ghost-button,
.icon-button,
.status-list span,
.assurance-strip span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.topbar-status {
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid #d9e2ef;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.74);
  color: #334155;
  font-weight: 700;
  white-space: nowrap;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.07);
}

.workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.8fr);
  gap: 20px;
  max-width: 1180px;
  margin: 0 auto;
}

.primary-surface,
.status-surface {
  border: 1px solid #dfe6ef;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
}

.primary-surface {
  display: grid;
  align-content: start;
  gap: 22px;
  min-height: 620px;
  padding: 28px;
}

.status-surface {
  display: grid;
  align-content: start;
  gap: 18px;
  padding: 22px;
}

.section-heading {
  display: grid;
  gap: 8px;
}

.section-heading.compact h2 {
  overflow-wrap: anywhere;
  font-size: 1.05rem;
}

.mode-badge {
  width: fit-content;
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid #b9d8d5;
  border-radius: 999px;
  color: #0f766e;
  background: #e9fbf7;
  font-size: 0.78rem;
  font-weight: 800;
}

.drop-zone {
  display: grid;
  place-items: center;
  min-height: 350px;
  padding: 28px;
  border: 2px dashed #aebdd0;
  border-radius: 8px;
  color: #52627a;
  background:
    linear-gradient(180deg, rgba(236, 244, 255, 0.75), rgba(255, 255, 255, 0.92)),
    #ffffff;
  cursor: pointer;
  transition:
    border-color 180ms ease,
    transform 180ms ease,
    background 180ms ease;
}

.drop-zone input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

.drop-zone svg {
  color: #2563eb;
}

.drop-zone.is-dragging {
  border-color: #0f766e;
  background: #eefcf9;
  transform: translateY(-2px);
}

.drop-zone.is-disabled {
  cursor: not-allowed;
  opacity: 0.68;
}

.drop-title {
  max-width: 100%;
  margin-top: 14px;
  color: #172033;
  font-size: 1.25rem;
  font-weight: 800;
  overflow-wrap: anywhere;
  text-align: center;
}

.drop-meta,
.inline-error {
  margin-top: 8px;
  font-size: 0.95rem;
  text-align: center;
}

.inline-error {
  color: #b42318;
  font-weight: 700;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.primary-button,
.ghost-button,
.icon-button {
  min-height: 44px;
  border-radius: 8px;
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    background 160ms ease;
}

.primary-button {
  padding: 0 18px;
  background: #175cd3;
  color: #ffffff;
  box-shadow: 0 14px 26px rgba(23, 92, 211, 0.22);
}

.primary-button:hover,
.ghost-button:hover,
.icon-button:hover {
  transform: translateY(-1px);
}

.primary-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
  transform: none;
  box-shadow: none;
}

.ghost-button {
  padding: 0 16px;
  border: 1px solid #ccd6e5;
  background: #ffffff;
  color: #334155;
}

.icon-button {
  justify-content: center;
  width: 44px;
  background: #101828;
  color: #ffffff;
}

.invite-box {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1px solid #c8d7ea;
  border-radius: 8px;
  background: #f8fbff;
}

.invite-box small,
.hash-box small,
.activity-log small,
.metric-grid small {
  display: block;
  color: #667085;
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
}

.invite-box strong {
  display: block;
  margin-top: 4px;
  overflow-wrap: anywhere;
  color: #172033;
}

.receiver-panel {
  display: grid;
  place-items: center;
  min-height: 350px;
  padding: 28px;
  border: 1px solid #dce5f2;
  border-radius: 8px;
  background: #f8fbff;
  text-align: center;
}

.receiver-panel svg {
  color: #0f766e;
}

.receiver-panel span {
  margin-top: 14px;
  color: #667085;
  font-weight: 800;
}

.receiver-panel strong {
  max-width: 100%;
  margin-top: 8px;
  overflow-wrap: anywhere;
  color: #172033;
  font-size: 1.3rem;
}

.meter-block {
  display: grid;
  gap: 12px;
}

.meter-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #334155;
  font-weight: 800;
}

.progress-track {
  height: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: #e5ebf4;
}

.progress-fill {
  width: 0;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #175cd3, #0f766e);
  transition: width 220ms ease;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.metric-grid span {
  min-width: 0;
  padding: 12px;
  border: 1px solid #e0e7f2;
  border-radius: 8px;
  color: #172033;
  background: #ffffff;
  font-weight: 800;
  overflow-wrap: anywhere;
}

.status-list {
  display: grid;
  gap: 8px;
}

.status-list span {
  min-height: 34px;
  color: #475467;
  font-weight: 700;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #d0d5dd;
}

.status-dot.is-live {
  background: #12b76a;
  box-shadow: 0 0 0 5px rgba(18, 183, 106, 0.12);
}

.assurance-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.assurance-strip span {
  min-height: 46px;
  padding: 0 12px;
  border: 1px solid #cbe7df;
  border-radius: 8px;
  background: #f0fdf9;
  color: #0f766e;
  font-weight: 800;
}

.hash-box {
  display: grid;
  gap: 6px;
  padding: 12px;
  border: 1px solid #dce5f2;
  border-radius: 8px;
  background: #f8fbff;
}

.hash-box code {
  color: #344054;
  font-size: 0.75rem;
  overflow-wrap: anywhere;
}

.notice-box {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  padding: 12px;
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fff5f5;
  color: #9f1239;
  font-weight: 700;
}

.activity-log {
  display: grid;
  gap: 8px;
}

.activity-log p {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 8px;
  color: #475467;
  font-size: 0.9rem;
}

.activity-log span {
  color: #667085;
  font-variant-numeric: tabular-nums;
}

.spin {
  animation: spin 800ms linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 900px) {
  .app-shell {
    padding: 18px;
  }

  .topbar,
  .workspace {
    grid-template-columns: 1fr;
  }

  .topbar {
    display: grid;
  }

  .topbar-status {
    justify-content: center;
    width: 100%;
  }

  .primary-surface {
    min-height: auto;
    padding: 20px;
  }

  .workspace {
    display: grid;
  }

  .metric-grid,
  .assurance-strip {
    grid-template-columns: 1fr;
  }

  .drop-zone,
  .receiver-panel {
    min-height: 280px;
  }
}

@media (max-width: 520px) {
  .app-shell {
    padding: 14px;
  }

  h1 {
    font-size: 2.15rem;
  }

  .primary-button,
  .ghost-button {
    justify-content: center;
    width: 100%;
  }

  .invite-box {
    grid-template-columns: 1fr;
  }

  .icon-button {
    width: 100%;
  }
}
