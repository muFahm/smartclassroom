import React from "react";
import { useOutletContext } from "react-router-dom";
import HasilPolling from "../../components/HasilPolling";
import TranskripSuara from "../../components/TranskripSuara";
import EkspresiSuara from "../../components/EkspresiSuara";
import EkspresiWajah from "../../components/EkspresiWajah";
import KlasifikasiGerakan from "../../components/KlasifikasiGerakan";
import AktivitasMahasiswa from "../../components/AktivitasMahasiswa";
import StatistikPengenalan from "../../components/StatistikPengenalan";
import PosisiKursi from "../../components/PosisiKursi";
import LiveKuisCard from "../../components/LiveKuisCard";
import AbsensiManagement from "../../components/AbsensiManagement";
import EnvironmentControl from "../../components/EnvironmentControl";
import PollingDeviceManagement from "../../components/polling/PollingDeviceManagement";
import BiometricRegistration from "../../components/biometric/BiometricRegistration";
import ClassOverviewDetail from "./ClassOverviewDetail";

export default function DashboardHome() {
  const {
    activeMode,
    selectedClass,
    widgets,
  } = useOutletContext();

  const isDefaultMode = ["default"].includes(activeMode);

  return (
    <>
      {isDefaultMode && (
        <>
          {widgets.posisiKursi && (
            <div className="widget-wrapper grid-posisi-denah">
              <PosisiKursi mode="denah" classroomId={selectedClass} />
            </div>
          )}

          {widgets.hasilPolling && (
            <div className="widget-wrapper grid-polling">
              <HasilPolling mode="default" />
            </div>
          )}

          {widgets.transkripSuara && (
            <div className="widget-wrapper grid-transkrip">
              <TranskripSuara />
            </div>
          )}

          <div className="charts-container">
            {widgets.ekspresiSuara && (
              <div className="widget-wrapper grid-ekspresi-suara">
                <EkspresiSuara />
              </div>
            )}

            {widgets.ekspresiWajah && (
              <div className="widget-wrapper grid-ekspresi-wajah">
                <EkspresiWajah />
              </div>
            )}

            {widgets.klasifikasiGerakan && (
              <div className="widget-wrapper grid-gerakan">
                <KlasifikasiGerakan />
              </div>
            )}

            {widgets.aktivitasMahasiswa && (
              <div className="widget-wrapper grid-aktivitas">
                <AktivitasMahasiswa />
              </div>
            )}
          </div>

          {widgets.statistikPengenalan && (
            <div className="widget-wrapper grid-statistik">
              <StatistikPengenalan />
            </div>
          )}
        </>
      )}

      {activeMode === "jadwal-kelas" && (
        <ClassOverviewDetail showEnterDashboard={false} />
      )}

      {activeMode === "absensi" && (
        <AbsensiManagement />
      )}

      {activeMode === "light-temp" && (
        <EnvironmentControl />
      )}

      {activeMode === "polling-device" && (
        <PollingDeviceManagement />
      )}

      {activeMode === "registrasi-biometrik" && (
        <BiometricRegistration />
      )}

      {activeMode === "kuis" && (
        <>
          <div className="grid-left-main">
            {widgets.hasilPolling && (
              <div className="widget-wrapper grid-live-kuis">
                <LiveKuisCard />
              </div>
            )}

            <div className="grid-mini-realtime">
              {widgets.ekspresiWajah && (
                <div className="widget-wrapper grid-ekspresi-wajah-mini">
                  <EkspresiWajah />
                </div>
              )}

              {widgets.ekspresiSuara && (
                <div className="widget-wrapper grid-ekspresi-suara-mini">
                  <EkspresiSuara />
                </div>
              )}
            </div>
          </div>

          <div className="grid-right-sidebar">
            {widgets.klasifikasiGerakan && (
              <div className="widget-wrapper grid-klasifikasi">
                <KlasifikasiGerakan />
              </div>
            )}

            {widgets.transkripSuara && (
              <div className="widget-wrapper grid-transkrip">
                <TranskripSuara />
              </div>
            )}

            {widgets.statistikPengenalan && (
              <div className="widget-wrapper grid-statistik">
                <StatistikPengenalan />
              </div>
            )}
          </div>
        </>
      )}

      {activeMode === "kolaborasi" && (
        <>
          {widgets.posisiKursi && (
            <div className="widget-wrapper grid-col1">
              <PosisiKursi mode="denah" showStats={true} classroomId={selectedClass} />
            </div>
          )}

          <div className="grid-col2">
            {widgets.ekspresiSuara && (
              <div className="widget-wrapper grid-ekspresi-suara-col2">
                <EkspresiSuara />
              </div>
            )}

            {widgets.klasifikasiGerakan && (
              <div className="widget-wrapper grid-klasifikasi-col2">
                <KlasifikasiGerakan />
              </div>
            )}
          </div>

          <div className="grid-col3">
            {widgets.ekspresiWajah && (
              <div className="widget-wrapper grid-ekspresi-wajah-col3">
                <EkspresiWajah />
              </div>
            )}

            {widgets.aktivitasMahasiswa && (
              <div className="widget-wrapper grid-aktivitas-col3">
                <AktivitasMahasiswa />
              </div>
            )}
          </div>

          <div className="grid-bottom-row">
            {widgets.statistikPengenalan && (
              <div className="widget-wrapper grid-statistik-bottom">
                <StatistikPengenalan />
              </div>
            )}

            {widgets.transkripSuara && (
              <div className="widget-wrapper grid-transkrip-bottom">
                <TranskripSuara />
              </div>
            )}
          </div>
        </>
      )}

      {activeMode === "diskusi" && (
        <>
          {widgets.transkripSuara && (
            <div className="widget-wrapper grid-transkrip">
              <TranskripSuara />
            </div>
          )}

          {widgets.ekspresiSuara && (
            <div className="widget-wrapper grid-ekspresi-suara">
              <EkspresiSuara />
            </div>
          )}

          {widgets.statistikPengenalan && (
            <div className="widget-wrapper grid-statistik">
              <StatistikPengenalan />
            </div>
          )}

          {widgets.ekspresiWajah && (
            <div className="widget-wrapper grid-ekspresi-wajah">
              <EkspresiWajah />
            </div>
          )}

          <div className="grid-bottom-row">
            {widgets.klasifikasiGerakan && (
              <div className="widget-wrapper grid-klasifikasi">
                <KlasifikasiGerakan />
              </div>
            )}

            {widgets.posisiKursi && (
              <div className="widget-wrapper grid-posisi">
                <PosisiKursi mode="denah" classroomId={selectedClass} />
              </div>
            )}

            {widgets.aktivitasMahasiswa && (
              <div className="widget-wrapper grid-aktivitas">
                <AktivitasMahasiswa />
              </div>
            )}
          </div>
        </>
      )}

      {activeMode === "presentasi" && (
        <>
          <div className="grid-left-main">
            {widgets.transkripSuara && (
              <div className="widget-wrapper grid-transkrip">
                <TranskripSuara />
              </div>
            )}

            {widgets.statistikPengenalan && (
              <div className="widget-wrapper grid-statistik">
                <StatistikPengenalan />
              </div>
            )}
          </div>

          <div className="grid-right-sidebar">
            {widgets.klasifikasiGerakan && (
              <div className="widget-wrapper grid-klasifikasi">
                <KlasifikasiGerakan />
              </div>
            )}

            {widgets.ekspresiSuara && (
              <div className="widget-wrapper grid-ekspresi-suara">
                <EkspresiSuara />
              </div>
            )}

            <div className="grid-mini-row">
              {widgets.aktivitasMahasiswa && (
                <div className="widget-wrapper grid-aktivitas-mini">
                  <AktivitasMahasiswa />
                </div>
              )}

              {widgets.ekspresiWajah && (
                <div className="widget-wrapper grid-ekspresi-wajah-mini">
                  <EkspresiWajah />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeMode === "brainstorming" && (
        <>
          <div className="grid-left-column">
            {widgets.transkripSuara && (
              <div className="widget-wrapper grid-transkrip">
                <TranskripSuara />
              </div>
            )}

            <div className="grid-left-bottom-row">
              {widgets.posisiKursi && (
                <div className="widget-wrapper grid-posisi">
                  <PosisiKursi mode="denah" classroomId={selectedClass} />
                </div>
              )}

              {widgets.ekspresiSuara && (
                <div className="widget-wrapper grid-ekspresi-suara-left">
                  <EkspresiSuara />
                </div>
              )}
            </div>
          </div>

          <div className="grid-right-sidebar">
            {widgets.statistikPengenalan && (
              <div className="widget-wrapper grid-statistik">
                <StatistikPengenalan />
              </div>
            )}

            {widgets.klasifikasiGerakan && (
              <div className="widget-wrapper grid-klasifikasi">
                <KlasifikasiGerakan />
              </div>
            )}

            <div className="grid-right-bottom-row">
              {widgets.ekspresiWajah && (
                <div className="widget-wrapper grid-ekspresi-wajah">
                  <EkspresiWajah />
                </div>
              )}

              {widgets.aktivitasMahasiswa && (
                <div className="widget-wrapper grid-aktivitas">
                  <AktivitasMahasiswa />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeMode === "belajar" && (
        <>
          <div className="belajar-left-column">
            <div className="belajar-top-row">
              {widgets.aktivitasMahasiswa && (
                <div className="widget-wrapper belajar-grid-aktivitas">
                  <AktivitasMahasiswa />
                </div>
              )}

              {widgets.ekspresiWajah && (
                <div className="widget-wrapper belajar-grid-wajah">
                  <EkspresiWajah />
                </div>
              )}
            </div>

            <div className="belajar-left-bottom-row">
              {widgets.hasilPolling && (
                <div className="widget-wrapper belajar-grid-polling-left">
                  <HasilPolling />
                </div>
              )}

              {widgets.posisiKursi && (
                <div className="widget-wrapper belajar-grid-posisi-denah">
                  <PosisiKursi mode="denah" classroomId={selectedClass} />
                </div>
              )}
            </div>
          </div>

          <div className="belajar-right-column">
            {widgets.transkripSuara && (
              <div className="widget-wrapper belajar-grid-transkrip">
                <TranskripSuara />
              </div>
            )}

            <div className="belajar-middle-row">
              {widgets.ekspresiSuara && (
                <div className="widget-wrapper belajar-grid-ekspresi">
                  <EkspresiSuara />
                </div>
              )}

              {widgets.klasifikasiGerakan && (
                <div className="widget-wrapper belajar-grid-klasifikasi">
                  <KlasifikasiGerakan />
                </div>
              )}
            </div>

            {widgets.statistikPengenalan && (
              <div className="widget-wrapper belajar-grid-statistik">
                <StatistikPengenalan />
              </div>
            )}
          </div>
        </>
      )}

      {activeMode === "kuis-page" && (
        <div className="quiz-route-placeholder">
          <p className="muted">Memuat halaman kuis...</p>
        </div>
      )}
    </>
  );
}
