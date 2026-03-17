import React, { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";

const ExploreBrandsHubPage: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    document.title = "Urban Prime | Explore Brands";
  }, []);

  const iframeSrc = useMemo(() => {
    const base = "/brandhub/explore%20brand%20hub%20page%20.html";
    return location.search ? `${base}${location.search}` : base;
  }, [location.search]);

  return (
    <div style={{ width: "100%", height: "100vh", background: "#f6f4f0" }}>
      <iframe
        title="Urban Prime Explore Brands"
        src={iframeSrc}
        style={{ width: "100%", height: "100%", border: "none" }}
      />
    </div>
  );
};

export default ExploreBrandsHubPage;
