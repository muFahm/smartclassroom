import React from "react";
import Navbar from "./components/Navbar";
import Card from "./components/Card";
import Footer from './components/Footer';
import "./Dashboard.css";

export default function Dashboard() {
  return (
    <>
      <Navbar />

      <div className="dashboard-container">
        <h2 className="dashboard-title">Dashboard Content</h2>

        <div className="dashboard-grid">
          <Card title="Card dengan Title">
            <p>Ini adalah contoh card dengan title</p>
          </Card>

          <Card
            title="Card dengan Button"
            headerAction={
              <button className="card-action-button">Action</button>
            }
          >
            <p>Card ini punya button di header</p>
          </Card>

          <Card>
            <p>Card tanpa title</p>
          </Card>
        </div>
      </div>

      <Footer />
    </>
  );
}