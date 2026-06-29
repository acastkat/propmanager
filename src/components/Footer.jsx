const Footer = () => {
  return (
    <footer role="contentinfo" aria-label="Pie de página" style={styles.footer}>
      <div style={styles.content}>
        <span style={styles.brand}>PropManager</span>
        <span style={styles.text}>Hecho en Salta · {new Date().getFullYear()}</span>
      </div>
    </footer>
  );
};

const styles = {
  footer: {
    position: "fixed",
    left: "50%",
    bottom: "1rem",
    transform: "translateX(-50%)",
    zIndex: 1000,
    width: "min(92vw, 760px)",
    padding: "0.7rem 1rem",
    borderRadius: "999px",
    backgroundColor: "var(--header-bg, #0f172a)",
    color: "var(--header-color, #f8fafc)",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.18)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
  },
  content: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
    flexWrap: "wrap",
  },
  brand: {
    fontWeight: 600,
    fontSize: "0.95rem",
  },
  text: {
    fontSize: "0.9rem",
    opacity: 0.9,
  },
};

export default Footer;