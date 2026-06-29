const Footer = () => {
  return (
    <footer role="contentinfo" aria-label="Pie de página" style={styles.footer}>
      <div style={styles.content}>
        <div style={styles.brandBlock}>
          <strong style={styles.brand}>PropManager</strong>
          <span style={styles.text}>
            Gestión inmobiliaria clara, rápida y ordenada.
          </span>
        </div>

        <span style={styles.copy}>© {new Date().getFullYear()} Hecho en Salta</span>
      </div>
    </footer>
  );
};

const styles = {
  footer: {
    marginTop: "auto",
    padding: "1rem 1.5rem 1.25rem",
    borderTop: "1px solid var(--border, #e5e7eb)",
    backgroundColor: "var(--surface, #f8fafc)",
    color: "var(--text-muted, #64748b)",
  },
  content: {
    maxWidth: "var(--app-max-width, 1120px)",
    margin: "0 auto",
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "0.75rem",
  },
  brandBlock: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.5rem",
  },
  brand: {
    color: "var(--text-primary, #0f172a)",
    fontWeight: 600,
  },
  text: {
    color: "var(--text-muted, #64748b)",
    fontSize: "0.95rem",
  },
  copy: {
    color: "var(--text-muted, #64748b)",
    fontSize: "0.9rem",
  },
};

export default Footer;