import React, { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";

const BrandsHubPage: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    document.title = "Urban Prime | Brand Hub";
  }, []);

  const iframeSrc = useMemo(() => {
    const base = "/brandhub/code.html";
    return location.search ? `${base}${location.search}` : base;
  }, [location.search]);

  return (
    <div style={{ width: "100%", height: "100vh", background: "#f6f4f0" }}>
      <iframe
        title="Urban Prime Brand Hub"
        src={iframeSrc}
        style={{ width: "100%", height: "100%", border: "none" }}
      />
    </div>
  );
};

export default BrandsHubPage;
