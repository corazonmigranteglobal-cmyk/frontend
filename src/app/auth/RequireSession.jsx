import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "./SessionContext";
import { isSessionValid } from "./sessionStorage";

export default function RequireSession({ children, loginPath = "/admin/login" }) {
  const { session, validateNow } = useSession();
  const location = useLocation();

  // Validate on every navigation to a guarded route
  useEffect(() => {
    validateNow();
  }, [location.key, validateNow]);

  if (!isSessionValid(session)) {
    return (
      <Navigate
        to={loginPath}
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return children;
}
