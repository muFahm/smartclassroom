import React from "react";
import "./Card.css";

export default function Card({
  children,
  title,
  className = "",
  headerAction,
}) {
  return (
    <div className={`card ${className}`}>
      {title && (
        <div className="card-header">
          <h3 className="card-title">{title}</h3>
          {headerAction && (
            <div className="card-header-action">{headerAction}</div>
          )}
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  );
}
