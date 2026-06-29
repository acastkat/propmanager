const Footer = () => {
  return (
    <footer role="contentinfo" aria-label="Pie de página" style={styles.footer}>
      <div style={styles.container}>
        <div style={styles.group}>
          <span style={styles.brand}>PropManager</span>
          <span style={styles.note}>Hecho en Salta</span>
        </div>

        <div style={styles.center}>
          © {new Date().getFullYear()} · Todos los derechos reservados
        </div>

        <div style={styles.group}>
          <a href="/soporte" style={styles.link}>
            Soporte
          </a>
          <a href="/privacidad" style={styles.link}>
            Privacidad
          </a>
          <a href="/terminos" style={styles.link}>
            Términos
          </a>
          <span style={styles.version}>v2.4.1</span>
        </div>
      </div>
    </footer>
  )
}

const styles = {
  footer: {
    padding: "1rem 1.5rem",
    borderTop: "1px solid rgba(15, 23, 42, 0.08)",
    backgroundColor: "var(--surface, #ffffff)",
    color: "var(--text-muted, #475569)",
  },
  container: {
    maxWidth: "var(--app-max-width, 1120px)",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: "1rem",
  },
  group: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    flexWrap: "wrap",
  },
  brand: {
    fontWeight: 600,
  },
  note: {
    fontSize: "0.95rem",
    color: "var(--text-muted, #64748b)",
  },
  center: {
    justifySelf: "center",
    fontSize: "0.95rem",
    color: "var(--text-muted, #64748b)",
  },
  link: {
    color: "var(--text-muted, #475569)",
    textDecoration: "none",
    fontSize: "0.95rem",
    opacity: 0.85,
  },
  version: {
    fontSize: "0.9rem",
    color: "var(--text-muted, #94a3b8)",
  },
}

export default Footer