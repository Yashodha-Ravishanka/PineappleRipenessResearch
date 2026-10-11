
import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  BookOpen,
  ClipboardList,
  Download,
  FlaskConical,
  Home,
  Leaf,
  Plus,
  Save,
  Target,
  Thermometer,
  Droplets,
  Wind,
  RefreshCw,
} from "lucide-react";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from "recharts";

import { demoExperiments } from "./data/demoData";
import "./App.css";

// ============================================
// BACKEND CONFIGURATION
// ============================================

const API_BASE_URL = "http://localhost:3000";
const SENSOR_QR_ID = "TEST001";
const REFRESH_INTERVAL = 5000;

const VARIETIES = [
  "Mauritius",
  "Kew",
  "MD-2",
  "Other / Unknown",
];

const NAVIGATION = [
  { id: "home", label: "Overview", icon: Home },
  { id: "research", label: "Research", icon: BookOpen },
  { id: "dashboard", label: "Sensor Dashboard", icon: Activity },
  { id: "experiments", label: "Experiments", icon: FlaskConical },
];

// ============================================
// CSV EXPORT
// ============================================

function downloadCSV(filename, rows) {
  if (!rows || rows.length === 0) {
    window.alert("There is no data to export yet.");
    return;
  }

  const headers = [
    ...new Set(rows.flatMap((row) => Object.keys(row))),
  ];

  const escapeCSV = (value) => {
    const text =
      value === null || value === undefined ? "" : String(value);

    return `"${text.replace(/"/g, '""')}"`;
  };

  const csv = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) =>
      headers.map((header) => escapeCSV(row[header])).join(",")
    ),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

// ============================================
// HELPERS
// ============================================

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

function average(values) {
  const validValues = values
    .map(Number)
    .filter((value) => Number.isFinite(value));

  if (validValues.length === 0) return null;

  return (
    validValues.reduce((total, value) => total + value, 0) /
    validValues.length
  );
}

function displayNumber(value, decimals = 1) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const number = Number(value);

  return Number.isFinite(number) ? number.toFixed(decimals) : "—";
}

// ============================================
// APPLICATION
// ============================================

function App() {
  const [activePage, setActivePage] = useState("home");

  // Real readings retrieved from the backend
  const [readings, setReadings] = useState([]);

  // Demo readings are kept separate from backend readings
  const [demoExtras, setDemoExtras] = useState([]);

  const [sensorConnection, setSensorConnection] =
    useState("connecting");

  const [sensorError, setSensorError] = useState("");
  const [lastFetched, setLastFetched] = useState(null);

  const [experiments, setExperiments] = useState(() =>
    Array.isArray(demoExperiments) ? demoExperiments : []
  );

  const [formData, setFormData] = useState({
    sampleId: "",
    variety: "Mauritius",
    temperature: "",
    humidity: "",
    mq135: "",
    ripeness: "",
    notes: "",
  });

  const [formMessage, setFormMessage] = useState("");

  // ============================================
  // FETCH REAL SENSOR READINGS
  // ============================================

  useEffect(() => {
    let active = true;

    const fetchSensorReadings = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/sensor/${encodeURIComponent(
            SENSOR_QR_ID
          )}`
        );

        if (!response.ok) {
          throw new Error(`Backend returned HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("The sensor API did not return an array.");
        }

        const mappedReadings = data
          .map((item) => ({
            ...item,
            source: "Backend",
            temperature:
              item.temperature == null
                ? null
                : Number(item.temperature),
            humidity:
              item.humidity == null
                ? null
                : Number(item.humidity),
            mq135:
              item.mq135 == null ? 0 : Number(item.mq135),
          }))
          .sort(
            (a, b) =>
              new Date(a.timestamp || 0).getTime() -
              new Date(b.timestamp || 0).getTime()
          );

        if (!active) return;

        setReadings(mappedReadings);
        setSensorConnection("connected");
        setSensorError("");
        setLastFetched(new Date());
      } catch (error) {
        if (!active) return;

        console.error("Failed to fetch sensor readings:", error);

        setSensorConnection("error");
        setSensorError(error.message || "Unable to reach backend.");
      }
    };

    fetchSensorReadings();

    const intervalId = setInterval(
      fetchSensorReadings,
      REFRESH_INTERVAL
    );

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, []);

  // ============================================
  // EXPERIMENT FORM
  // ============================================

  const updateForm = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setFormMessage("");
  };

  const saveExperiment = (event) => {
    event.preventDefault();

    const temperature = Number(formData.temperature);
    const humidity = Number(formData.humidity);
    const mq135 = Number(formData.mq135);

    if (
      !formData.sampleId.trim() ||
      !formData.variety ||
      formData.temperature === "" ||
      formData.humidity === "" ||
      formData.mq135 === "" ||
      !formData.ripeness
    ) {
      setFormMessage("Please complete all required fields.");
      return;
    }

    if (
      !Number.isFinite(temperature) ||
      !Number.isFinite(humidity) ||
      !Number.isFinite(mq135)
    ) {
      setFormMessage("Enter valid numeric sensor measurements.");
      return;
    }

    if (humidity < 0 || humidity > 100) {
      setFormMessage(
        "Relative humidity must be between 0 and 100%."
      );
      return;
    }

    const newExperiment = {
      sampleId: formData.sampleId.trim(),
      variety: formData.variety,
      temperature,
      humidity,
      mq135,
      ripeness: formData.ripeness,
      notes: formData.notes.trim(),
      timestamp: new Date().toISOString(),
    };

    setExperiments((previous) => [
      ...previous,
      newExperiment,
    ]);

    setFormData({
      sampleId: "",
      variety: "Mauritius",
      temperature: "",
      humidity: "",
      mq135: "",
      ripeness: "",
      notes: "",
    });

    setFormMessage(
      "Experiment saved for this session only."
    );
  };

  // ============================================
  // EXPORT FUNCTIONS
  // ============================================

  const exportExperiments = () => {
    downloadCSV(
      "pineapple-ripeness-experiments.csv",
      experiments
    );
  };

  const exportReadings = () => {
    const exportRows = [
      ...readings.map((reading) => ({
        ...reading,
        source: "Backend",
      })),
      ...demoExtras.map((reading) => ({
        ...reading,
        source: "Demo",
      })),
    ];

    downloadCSV(
      "pineapple-sensor-readings.csv",
      exportRows
    );
  };

  // ============================================
  // ADD A SEPARATE DEMO READING
  // ============================================

  const addDemoReading = () => {
    const newReading = {
      id: `demo-${Date.now()}`,
      timestamp: new Date().toISOString(),
      temperature: Number(
        (28 + Math.random() * 5).toFixed(1)
      ),
      humidity: Number(
        (65 + Math.random() * 15).toFixed(1)
      ),
      mq135: Math.round(250 + Math.random() * 300),
      source: "Demo",
    };

    setDemoExtras((previous) => [
      ...previous,
      newReading,
    ]);
  };

  // ============================================
  // VARIETY COMPARISON
  // ============================================

  const varietyComparison = VARIETIES.map((variety) => {
    const varietyExperiments = experiments.filter(
      (experiment) => experiment.variety === variety
    );

    return {
      variety,
      samples: varietyExperiments.length,
      averageTemperature: average(
        varietyExperiments.map((item) => item.temperature)
      ),
      averageHumidity: average(
        varietyExperiments.map((item) => item.humidity)
      ),
      averageMQ135: average(
        varietyExperiments.map((item) => item.mq135)
      ),
    };
  });

  // Backend readings are kept separate from demo readings.
  // The charts may display both, but each row has a source label.
  const allDisplayReadings = [
    ...readings,
    ...demoExtras,
  ];

  const chartReadings = allDisplayReadings.map(
    (reading, index) => ({
      ...reading,
      name: reading.timestamp
        ? new Date(reading.timestamp).toLocaleTimeString(
            [],
            {
              hour: "2-digit",
              minute: "2-digit",
            }
          )
        : `Reading ${index + 1}`,
      temperature:
        reading.temperature == null
          ? null
          : Number(reading.temperature),
      humidity:
        reading.humidity == null
          ? null
          : Number(reading.humidity),
      mq135: Number(
        reading.mq135 ?? reading.gasReading ?? 0
      ),
    })
  );

  // Statistics are calculated only from backend readings.
  const averageTemperature = average(
    readings.map((reading) => reading.temperature)
  );

  const averageHumidity = average(
    readings.map((reading) => reading.humidity)
  );

  const averageGasResponse = average(
    readings.map((reading) => reading.mq135)
  );

  const renderPageTitle = () => {
    const page = NAVIGATION.find(
      (item) => item.id === activePage
    );

    return page ? page.label : "Overview";
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <Leaf size={25} />
          </div>

          <div className="brand-text">
            <h1>Pineapple AI</h1>
            <span>Management System</span>
          </div>
        </div>

        <div className="sidebar-section-label">
          WORKSPACE
        </div>

        <nav className="sidebar-nav">
          {NAVIGATION.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                className={`nav-item ${
                  activePage === item.id
                    ? "nav-item-active"
                    : ""
                }`}
                onClick={() => setActivePage(item.id)}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-status">
            <span className="status-dot" />
            <div>
              <strong>Research workspace</strong>
              <span>Experimental study</span>
            </div>
          </div>

          <p className="sidebar-version">
            Pineapple AI Management System
          </p>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <div>
              <div className="topbar-breadcrumb">
                Pineapple AI Management System /{" "}
                {renderPageTitle()}
              </div>
              <h2>{renderPageTitle()}</h2>
            </div>
          </div>

          <div className="topbar-status">
            <span className="status-dot" />
            <span>Research mode</span>
          </div>
        </header>

        <div className="page-content">
          {/* ================================== */}
          {/* OVERVIEW PAGE */}
          {/* ================================== */}

          {activePage === "home" && (
            <div className="overview-page">
              <section className="hero-section">
                <div className="hero-content">
                  <div className="section-kicker">
                    <Leaf size={15} />
                    PINEAPPLE QUALITY MONITORING
                  </div>

                  <h1>
                    Pineapple AI Management System:{" "}
                    <span>Smart Ripeness Detection.</span>
                  </h1>

                  <p>
                    This project explores smart pineapple
                    quality monitoring through sensor-assisted
                    environmental observation, gas sensor
                    response analysis and artificial intelligence.
                    The research investigates whether these
                    measurements can help characterize pineapple
                    ripeness during storage and post-harvest
                    handling.
                  </p>

                  <div className="hero-actions">
                    <button
                      className="primary-button"
                      onClick={() =>
                        setActivePage("research")
                      }
                    >
                      <BookOpen size={17} />
                      Explore research
                    </button>

                    <button
                      className="secondary-button"
                      onClick={() =>
                        setActivePage("experiments")
                      }
                    >
                      <FlaskConical size={17} />
                      Record experiment
                    </button>
                  </div>
                </div>

                <div className="hero-visual">
                  <div className="hero-visual-circle">
                    <Leaf size={76} strokeWidth={1.25} />
                  </div>
                  <div className="hero-visual-caption">
                    <span className="visual-pulse" />
                    Sensor-assisted quality research
                  </div>
                </div>
              </section>

              <section className="section-block">
                <div className="section-heading">
                  <div>
                    <div className="section-kicker">
                      PROJECT WORKSPACE
                    </div>
                    <h2>Explore the project</h2>
                    <p>
                      Review the research, inspect sensor
                      readings and record experimental
                      observations.
                    </p>
                  </div>
                </div>

                <div className="feature-grid">
                  <button
                    className="feature-card"
                    onClick={() =>
                      setActivePage("research")
                    }
                  >
                    <div className="feature-icon feature-icon-green">
                      <BookOpen size={23} />
                    </div>
                    <h3>Research &amp; methodology</h3>
                    <p>
                      Review the research background,
                      objectives, workflow and experimental
                      limitations.
                    </p>
                    <span className="feature-link">
                      Explore methodology
                    </span>
                  </button>

                  <button
                    className="feature-card"
                    onClick={() =>
                      setActivePage("dashboard")
                    }
                  >
                    <div className="feature-icon feature-icon-yellow">
                      <Activity size={23} />
                    </div>
                    <h3>Sensor dashboard</h3>
                    <p>
                      Inspect temperature, humidity and gas
                      sensor response readings.
                    </p>
                    <span className="feature-link">
                      View dashboard
                    </span>
                  </button>

                  <button
                    className="feature-card"
                    onClick={() =>
                      setActivePage("experiments")
                    }
                  >
                    <div className="feature-icon feature-icon-orange">
                      <FlaskConical size={23} />
                    </div>
                    <h3>Experimental records</h3>
                    <p>
                      Record pineapple variety, sensor
                      measurements and reference ripeness labels.
                    </p>
                    <span className="feature-link">
                      Manage experiments
                    </span>
                  </button>
                </div>
              </section>

              <section className="section-block">
                <div className="section-heading">
                  <div>
                    <div className="section-kicker">
                      RESEARCH FOUNDATION
                    </div>
                    <h2>Background &amp; problem statement</h2>
                  </div>
                </div>

                <div className="content-panel">
                  <h3 className="panel-heading">
                    Background
                  </h3>

                  <p>
                    Pineapple ripeness influences eating
                    quality, storage life, handling and
                    commercial value. Assessing ripeness
                    consistently can be challenging when
                    decisions rely mainly on visual inspection
                    or subjective judgement. Changes in
                    volatile compounds released by fruit may
                    provide additional information that can be
                    investigated alongside environmental
                    conditions such as temperature and relative
                    humidity.
                  </p>

                  <p>
                    Gas sensors can respond to mixtures of
                    volatile compounds, while machine learning
                    methods can be evaluated to determine whether
                    measured patterns are associated with
                    independently assessed ripeness categories.
                    The usefulness of this approach must be
                    established through controlled experiments
                    and appropriately labelled samples.
                  </p>

                  <div className="research-note">
                    <div className="note-icon">
                      <ClipboardList size={20} />
                    </div>
                    <div>
                      <h4>Problem statement</h4>
                      <p>
                        It remains necessary to investigate
                        whether gas sensor response patterns
                        and environmental measurements can
                        provide useful, repeatable information
                        for distinguishing pineapple ripeness
                        stages under documented experimental
                        conditions.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="section-block">
                <div className="section-heading">
                  <div>
                    <div className="section-kicker">
                      STUDY DIRECTION
                    </div>
                    <h2>Aim &amp; research objectives</h2>
                  </div>
                </div>

                <div className="content-panel">
                  <h3 className="panel-heading">
                    Overall aim
                  </h3>

                  <p>
                    To investigate the potential of gas sensor
                    responses and environmental measurements,
                    combined with artificial intelligence, for
                    pineapple ripeness assessment.
                  </p>

                  <h3 className="panel-heading objective-heading">
                    Specific objectives
                  </h3>

                  <div className="workflow-list">
                    <div className="workflow-row">
                      <div className="workflow-step">01</div>
                      <div>
                        <h4>Collect sensor measurements</h4>
                        <p>
                          Record gas sensor response,
                          temperature and relative humidity
                          under documented conditions.
                        </p>
                      </div>
                    </div>

                    <div className="workflow-row">
                      <div className="workflow-step">02</div>
                      <div>
                        <h4>Document pineapple samples</h4>
                        <p>
                          Record sample identifiers,
                          pineapple varieties and reference
                          ripeness assessments.
                        </p>
                      </div>
                    </div>

                    <div className="workflow-row">
                      <div className="workflow-step">03</div>
                      <div>
                        <h4>Compare experimental observations</h4>
                        <p>
                          Examine sensor response patterns
                          across recorded samples and
                          experimental conditions.
                        </p>
                      </div>
                    </div>

                    <div className="workflow-row">
                      <div className="workflow-step">04</div>
                      <div>
                        <h4>Evaluate machine learning methods</h4>
                        <p>
                          Investigate whether measured
                          features can support ripeness
                          classification using independent
                          evaluation data.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="section-block">
                <div className="section-heading">
                  <div>
                    <div className="section-kicker">
                      QUESTIONS TO INVESTIGATE
                    </div>
                    <h2>Research questions</h2>
                  </div>
                </div>

                <div className="research-question-grid">
                  <div className="content-panel">
                    <div className="question-number">RQ 01</div>
                    <h3>Gas sensor response</h3>
                    <p>
                      Do gas sensor response patterns vary
                      between pineapple samples with different
                      reference ripeness labels?
                    </p>
                  </div>

                  <div className="content-panel">
                    <div className="question-number">RQ 02</div>
                    <h3>Environmental conditions</h3>
                    <p>
                      How do temperature and relative humidity
                      vary during measurement, and how might
                      they influence sensor observations?
                    </p>
                  </div>

                  <div className="content-panel">
                    <div className="question-number">RQ 03</div>
                    <h3>Variety comparison</h3>
                    <p>
                      Are there observable differences in
                      recorded measurements among the pineapple
                      varieties studied?
                    </p>
                  </div>

                  <div className="content-panel">
                    <div className="question-number">RQ 04</div>
                    <h3>AI classification</h3>
                    <p>
                      Can a machine learning model distinguish
                      reference ripeness categories when
                      evaluated using appropriate independent
                      data?
                    </p>
                  </div>
                </div>
              </section>

              <section className="research-note">
                <div className="note-icon">
                  <Wind size={21} />
                </div>
                <div>
                  <h3>Important scientific limitation</h3>
                  <p>
                    The MQ-135 is a broad-response gas sensor,
                    not a selective ethylene detector. Its raw
                    ADC output is not a calibrated gas
                    concentration and cannot, by itself,
                    confirm pineapple ripeness. Reliable
                    conclusions require reference labels,
                    controlled measurements and validation
                    using real experimental data.
                  </p>
                </div>
              </section>
            </div>
          )}

          {/* ================================== */}
          {/* RESEARCH PAGE */}
          {/* ================================== */}

          {activePage === "research" && (
            <div className="research-page">
              <section className="page-intro">
                <div className="section-kicker">
                  PROJECT DOCUMENTATION
                </div>
                <h2>Research &amp; methodology</h2>
                <p>
                  This study investigates the potential of gas
                  sensor responses, environmental monitoring
                  and machine learning for pineapple ripeness
                  assessment. The proposed methodology
                  emphasizes repeatable measurements,
                  documented sample conditions, independent
                  reference labels and objective model
                  evaluation.
                </p>
              </section>

              <section className="content-panel research-scope-panel">
                <h3 className="panel-heading">
                  Research scope &amp; significance
                </h3>

                <p>
                  The research focuses on collecting and
                  comparing gas sensor response patterns
                  alongside temperature and relative humidity
                  measurements from documented pineapple
                  samples. The recorded data can be organized
                  by sample, variety, experimental conditions
                  and reference ripeness category.
                </p>

                <p>
                  If supported by experimental results, this
                  approach could inform the development of
                  sensor-assisted monitoring for post-harvest
                  handling and storage. Its practical value
                  must be assessed through testing; it should
                  not be assumed from demonstration readings
                  or unvalidated model predictions.
                </p>

                <div className="workflow-list">
                  <div className="workflow-row">
                    <div className="workflow-step">01</div>
                    <div>
                      <h4>Study samples</h4>
                      <p>
                        Assign sample identifiers and record
                        pineapple variety and relevant
                        handling conditions.
                      </p>
                    </div>
                  </div>

                  <div className="workflow-row">
                    <div className="workflow-step">02</div>
                    <div>
                      <h4>Collect measurements</h4>
                      <p>
                        Record gas sensor response,
                        temperature and relative humidity
                        consistently.
                      </p>
                    </div>
                  </div>

                  <div className="workflow-row">
                    <div className="workflow-step">03</div>
                    <div>
                      <h4>Establish reference labels</h4>
                      <p>
                        Record ripeness categories using a
                        documented assessment method
                        independent of the model output.
                      </p>
                    </div>
                  </div>

                  <div className="workflow-row">
                    <div className="workflow-step">04</div>
                    <div>
                      <h4>Evaluate models</h4>
                      <p>
                        Assess model performance on held-out
                        data and report suitable
                        classification metrics.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="method-grid">
                <div className="method-card">
                  <div className="feature-icon feature-icon-green">
                    <Wind size={22} />
                  </div>
                  <h3>Gas sensing</h3>
                  <p>
                    Record the gas sensor's response under
                    documented conditions. MQ-135 measurements
                    should be treated as broad-response
                    readings rather than direct measurements
                    of a specific gas.
                  </p>
                </div>

                <div className="method-card">
                  <div className="feature-icon feature-icon-yellow">
                    <Thermometer size={22} />
                  </div>
                  <h3>Environmental monitoring</h3>
                  <p>
                    Record temperature and relative humidity
                    because environmental conditions may
                    influence fruit storage and sensor
                    response.
                  </p>
                </div>

                <div className="method-card">
                  <div className="feature-icon feature-icon-orange">
                    <FlaskConical size={22} />
                  </div>
                  <h3>Controlled experiments</h3>
                  <p>
                    Use consistent sample identifiers,
                    measurement procedures, reference labels
                    and recorded experimental conditions.
                  </p>
                </div>

                <div className="method-card">
                  <div className="feature-icon feature-icon-green">
                    <BarChart3 size={22} />
                  </div>
                  <h3>AI model evaluation</h3>
                  <p>
                    Investigate relationships between
                    recorded features and reference ripeness
                    categories, then evaluate model
                    performance using data not used for
                    training.
                  </p>
                </div>
              </section>

              <section className="content-panel">
                <h3 className="panel-heading">
                  Proposed research workflow
                </h3>

                <div className="workflow-list">
                  <div className="workflow-row">
                    <div className="workflow-step">01</div>
                    <div>
                      <h4>Prepare and identify samples</h4>
                      <p>
                        Assign unique IDs and document sample
                        variety and experimental conditions.
                      </p>
                    </div>
                  </div>

                  <div className="workflow-row">
                    <div className="workflow-step">02</div>
                    <div>
                      <h4>Collect sensor data</h4>
                      <p>
                        Record gas response and environmental
                        readings using a consistent procedure.
                      </p>
                    </div>
                  </div>

                  <div className="workflow-row">
                    <div className="workflow-step">03</div>
                    <div>
                      <h4>Record reference ripeness</h4>
                      <p>
                        Establish labels through a documented
                        assessment method instead of relying
                        on sensor values alone.
                      </p>
                    </div>
                  </div>

                  <div className="workflow-row">
                    <div className="workflow-step">04</div>
                    <div>
                      <h4>Analyze and evaluate</h4>
                      <p>
                        Compare observations and evaluate
                        any trained classification model
                        using independent data.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="research-note">
                <div className="note-icon">
                  <ClipboardList size={21} />
                </div>
                <div>
                  <h3>Data quality and limitations</h3>
                  <p>
                    Sensor readings can be affected by
                    calibration, warm-up time, temperature,
                    humidity, sensor placement and other
                    volatile compounds. Demonstration data
                    should not be presented as experimental
                    evidence. Conclusions about ripeness
                    detection require actual measurements
                    and validation.
                  </p>
                </div>
              </section>
            </div>
          )}

          {/* ================================== */}
          {/* SENSOR DASHBOARD */}
          {/* ================================== */}

          {activePage === "dashboard" && (
            <div className="dashboard-page">
              <section className="page-intro">
                <div className="section-kicker">
                  MEASUREMENT OVERVIEW
                </div>
                <h2>Sensor dashboard</h2>
                <p>
                  Sensor readings are retrieved from the
                  Pineapple AI backend for sample{" "}
                  <strong>{SENSOR_QR_ID}</strong>. The page
                  refreshes every five seconds. Backend
                  records may include test readings until the
                  ESP32 is connected and sending measurements.
                </p>
              </section>

              <div className="dashboard-toolbar">
                <div className="data-status">
                  <span className="status-dot" />

                  {sensorConnection === "connected"
                    ? "Connected to backend"
                    : sensorConnection === "connecting"
                      ? "Connecting to backend..."
                      : "Backend unavailable"}
                </div>

                <div className="toolbar-actions">
                  <button
                    className="secondary-button"
                    onClick={addDemoReading}
                  >
                    <Plus size={16} />
                    Add demo reading
                  </button>

                  <button
                    className="primary-button"
                    onClick={exportReadings}
                  >
                    <Download size={16} />
                    Export CSV
                  </button>
                </div>
              </div>

              {sensorConnection === "error" && (
                <section className="research-note">
                  <div className="note-icon">
                    <Activity size={20} />
                  </div>
                  <div>
                    <h3>Unable to retrieve sensor readings</h3>
                    <p>
                      {sensorError}
                    </p>
                    <p>
                      Check that the Express backend is
                      running on port 3000 and that the
                      sensor endpoint is accessible.
                    </p>
                  </div>
                </section>
              )}

              
<section className="stats-grid">
  <div className="stat-card stat-card-green">
    <div className="stat-card-top">
      <div className="stat-icon stat-icon-green">
        <Activity size={22} />
      </div>
      <span className="stat-tag">DATABASE</span>
    </div>
    <div className="stat-label">Backend readings</div>
    <div className="stat-value">
      {String(readings.length).padStart(2, "0")}
    </div>
    <div className="stat-description">
      <span className="stat-mini-dot" />
      Records for {SENSOR_QR_ID}
    </div>
  </div>

  <div className="stat-card stat-card-orange">
    <div className="stat-card-top">
      <div className="stat-icon stat-icon-orange">
        <Thermometer size={22} />
      </div>
      <span className="stat-tag">TEMPERATURE</span>
    </div>
    <div className="stat-label">Average temperature</div>
    <div className="stat-value">
      {displayNumber(averageTemperature)}
      <span className="stat-unit">°C</span>
    </div>
    <div className="stat-description">
      Calculated from backend readings
    </div>
  </div>

  <div className="stat-card stat-card-blue">
    <div className="stat-card-top">
      <div className="stat-icon stat-icon-blue">
        <Droplets size={22} />
      </div>
      <span className="stat-tag">HUMIDITY</span>
    </div>
    <div className="stat-label">Average humidity</div>
    <div className="stat-value">
      {displayNumber(averageHumidity)}
      <span className="stat-unit">%</span>
    </div>
    <div className="stat-description">
      Relative humidity
    </div>
  </div>

  <div className="stat-card stat-card-yellow">
    <div className="stat-card-top">
      <div className="stat-icon stat-icon-yellow">
        <Wind size={22} />
      </div>
      <span className="stat-tag">MQ-135 SENSOR</span>
    </div>
    <div className="stat-label">Average gas response</div>
    <div className="stat-value">
      {displayNumber(averageGasResponse, 0)}
    </div>
    <div className="stat-description">
      Raw sensor readings · Not calibrated gas concentration
    </div>
  </div>



                <div className="stat-card">
                  <div className="stat-icon stat-icon-orange">
                    <Thermometer size={21} />
                  </div>
                  <div className="stat-label">
                    Average temperature
                  </div>
                  <div className="stat-value">
                    {displayNumber(averageTemperature)}{" "}
                    <span>°C</span>
                  </div>
                  <div className="stat-description">
                    Backend readings only
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon stat-icon-blue">
                    <Droplets size={21} />
                  </div>
                  <div className="stat-label">
                    Average humidity
                  </div>
                  <div className="stat-value">
                    {displayNumber(averageHumidity)}{" "}
                    <span>%</span>
                  </div>
                  <div className="stat-description">
                    Relative humidity
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon stat-icon-yellow">
                    <Wind size={21} />
                  </div>
                  <div className="stat-label">
                    Average gas response
                  </div>
                  <div className="stat-value">
                    {displayNumber(averageGasResponse, 0)}
                  </div>
                  <div className="stat-description">
                    MQ-135 raw readings
                  </div>
                </div>
              </section>

              <section className="content-panel">
                <div className="table-heading">
                  <div>
                    <h3 className="panel-heading">
                      Connection information
                    </h3>
                    <p>
                      Backend endpoint:{" "}
                      <code>
                        GET /api/sensor/{SENSOR_QR_ID}
                      </code>
                    </p>
                    <p>
                      {lastFetched
                        ? `Last successful refresh: ${formatDate(
                            lastFetched
                          )}`
                        : "Waiting for the first successful response."}
                    </p>
                  </div>
                </div>
              </section>

              <section className="chart-grid">
                <div className="chart-card">
                  <div className="chart-card-heading">
                    <div>
                      <h3>Temperature &amp; humidity</h3>
                      <p>
                        Backend and separately labelled demo readings
                      </p>
                    </div>
                    <Activity size={19} />
                  </div>

                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={chartReadings}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />

                        <Line
                          type="monotone"
                          dataKey="temperature"
                          name="Temperature (°C)"
                          stroke="#65a30d"
                          strokeWidth={2}
                          dot={false}
                          connectNulls
                        />

                        <Line
                          type="monotone"
                          dataKey="humidity"
                          name="Humidity (%)"
                          stroke="#eab308"
                          strokeWidth={2}
                          dot={false}
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="chart-card">
                  <div className="chart-card-heading">
                    <div>
                      <h3>Gas sensor response</h3>
                      <p>Raw MQ-135 response readings</p>
                    </div>
                    <Wind size={19} />
                  </div>

                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={chartReadings}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />

                        <Area
                          type="monotone"
                          dataKey="mq135"
                          name="MQ-135 raw reading"
                          stroke="#84cc16"
                          fill="#bef264"
                          fillOpacity={0.45}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>

              <section className="content-panel table-panel">
                <div className="table-heading">
                  <div>
                    <h3 className="panel-heading">
                      Sensor readings
                    </h3>
                    <p>
                      {readings.length} backend records and{" "}
                      {demoExtras.length} demo records
                    </p>
                  </div>

                  <button
                    className="secondary-button"
                    onClick={exportReadings}
                  >
                    <Download size={16} />
                    Export
                  </button>
                </div>

                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Source</th>
                        <th>Timestamp</th>
                        <th>Temperature (°C)</th>
                        <th>Humidity (%)</th>
                        <th>MQ-135 raw</th>
                      </tr>
                    </thead>

                    <tbody>
                      {[...allDisplayReadings]
                        .reverse()
                        .map((reading, index) => (
                          <tr
                            key={
                              reading._id ??
                              reading.id ??
                              `${reading.timestamp}-${index}`
                            }
                          >
                            <td>
                              {reading.source === "Demo"
                                ? "Demo"
                                : "Backend"}
                            </td>
                            <td>
                              {formatDate(reading.timestamp)}
                            </td>
                            <td>
                              {displayNumber(
                                reading.temperature
                              )}
                            </td>
                            <td>
                              {displayNumber(
                                reading.humidity
                              )}
                            </td>
                            <td>
                              {displayNumber(
                                reading.mq135 ??
                                  reading.gasReading,
                                0
                              )}
                            </td>
                          </tr>
                        ))}

                      {allDisplayReadings.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="empty-state"
                          >
                            {sensorConnection === "connecting"
                              ? "Loading sensor readings..."
                              : "No readings available for this sample."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="research-note">
                <div className="note-icon">
                  <Wind size={20} />
                </div>
                <div>
                  <h3>Interpreting sensor readings</h3>
                  <p>
                    MQ-135 raw readings are not direct
                    measurements of pineapple ripeness or
                    calibrated gas concentrations. Use
                    reference labels and validated experimental
                    results to assess whether sensor readings
                    are useful for classification. Demo
                    readings are not experimental evidence.
                  </p>
                </div>
              </section>
            </div>
          )}

          {/* ================================== */}
          {/* EXPERIMENTS PAGE */}
          {/* ================================== */}

          {activePage === "experiments" && (
            <div className="experiments-page">
              <section className="page-intro">
                <div className="section-kicker">
                  EXPERIMENTAL DATA COLLECTION
                </div>
                <h2>Experiments</h2>
                <p>
                  Record pineapple samples, sensor measurements
                  and reference ripeness labels. These records
                  are kept in the current browser session and
                  are not saved to a backend database.
                </p>
              </section>

              <section className="content-panel experiment-form-panel">
                <div className="table-heading">
                  <div>
                    <h3 className="panel-heading">
                      <FlaskConical size={19} />
                      Record a new experiment
                    </h3>
                    <p>
                      Enter measurements and the independently
                      assessed ripeness category for the sample.
                    </p>
                  </div>
                </div>

                <form
                  className="experiment-form"
                  onSubmit={saveExperiment}
                >
                  <div className="form-grid">
                    <label className="form-field">
                      <span>Sample / batch ID *</span>
                      <input
                        type="text"
                        name="sampleId"
                        value={formData.sampleId}
                        onChange={updateForm}
                        placeholder="e.g. PINE-001"
                        required
                      />
                    </label>

                    <label className="form-field">
                      <span>Pineapple variety *</span>
                      <select
                        name="variety"
                        value={formData.variety}
                        onChange={updateForm}
                        required
                      >
                        {VARIETIES.map((variety) => (
                          <option
                            key={variety}
                            value={variety}
                          >
                            {variety}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="form-field">
                      <span>Temperature (°C) *</span>
                      <input
                        type="number"
                        name="temperature"
                        value={formData.temperature}
                        onChange={updateForm}
                        step="any"
                        placeholder="e.g. 28.5"
                        required
                      />
                    </label>

                    <label className="form-field">
                      <span>Relative humidity (%) *</span>
                      <input
                        type="number"
                        name="humidity"
                        value={formData.humidity}
                        onChange={updateForm}
                        min="0"
                        max="100"
                        step="any"
                        placeholder="e.g. 72"
                        required
                      />
                    </label>

                    <label className="form-field">
                      <span>MQ-135 raw reading *</span>
                      <input
                        type="number"
                        name="mq135"
                        value={formData.mq135}
                        onChange={updateForm}
                        min="0"
                        step="any"
                        placeholder="e.g. 350"
                        required
                      />
                    </label>

                    <label className="form-field">
                      <span>Reference ripeness label *</span>
                      <select
                        name="ripeness"
                        value={formData.ripeness}
                        onChange={updateForm}
                        required
                      >
                        <option value="">
                          Select reference label
                        </option>
                        <option value="Unripe">Unripe</option>
                        <option value="Partially ripe">
                          Partially ripe
                        </option>
                        <option value="Ripe">Ripe</option>
                        <option value="Overripe">
                          Overripe
                        </option>
                      </select>
                    </label>

                    <label className="form-field form-field-full">
                      <span>Experimental notes</span>
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={updateForm}
                        rows={3}
                        placeholder="Sample condition, measurement procedure, storage duration or other observations"
                      />
                    </label>
                  </div>

                  {formMessage && (
                    <div
                      className="form-message"
                      role="status"
                    >
                      {formMessage}
                    </div>
                  )}

                  <div className="form-actions">
                    <button
                      type="submit"
                      className="primary-button"
                    >
                      <Save size={17} />
                      Save experiment
                    </button>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={exportExperiments}
                    >
                      <Download size={17} />
                      Export experiments
                    </button>
                  </div>
                </form>
              </section>

              <section className="content-panel table-panel">
                <div className="table-heading">
                  <div>
                    <h3 className="panel-heading">
                      Experimental records
                    </h3>
                    <p>
                      {experiments.length} records in the
                      current session
                    </p>
                  </div>

                  <button
                    className="secondary-button"
                    onClick={exportExperiments}
                  >
                    <Download size={16} />
                    Export CSV
                  </button>
                </div>

                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Sample ID</th>
                        <th>Variety</th>
                        <th>Temperature (°C)</th>
                        <th>Humidity (%)</th>
                        <th>MQ-135 raw</th>
                        <th>Reference ripeness</th>
                        <th>Notes</th>
                        <th>Recorded at</th>
                      </tr>
                    </thead>

                    <tbody>
                      {experiments.map((experiment, index) => (
                        <tr
                          key={
                            experiment.id ??
                            experiment._id ??
                            `${experiment.sampleId ?? "sample"}-${index}`
                          }
                        >
                          <td>
                            {experiment.sampleId ?? "—"}
                          </td>
                          <td>{experiment.variety ?? "—"}</td>
                          <td>
                            {displayNumber(
                              experiment.temperature
                            )}
                          </td>
                          <td>
                            {displayNumber(
                              experiment.humidity
                            )}
                          </td>
                          <td>
                            {displayNumber(
                              experiment.mq135,
                              0
                            )}
                          </td>
                          <td>
                            <span className="ripeness-label">
                              {experiment.ripeness ?? "—"}
                            </span>
                          </td>
                          <td>{experiment.notes || "—"}</td>
                          <td>
                            {formatDate(experiment.timestamp)}
                          </td>
                        </tr>
                      ))}

                      {experiments.length === 0 && (
                        <tr>
                          <td
                            colSpan={8}
                            className="empty-state"
                          >
                            No experiments recorded yet. Use
                            the form above to add your first
                            sample.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="content-panel table-panel">
                <div className="table-heading">
                  <div>
                    <h3 className="panel-heading">
                      Variety comparison
                    </h3>
                    <p>
                      Average recorded measurements for each
                      variety in the current experimental
                      dataset.
                    </p>
                  </div>
                </div>

                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Variety</th>
                        <th>Sample count</th>
                        <th>Average temperature (°C)</th>
                        <th>Average humidity (%)</th>
                        <th>Average MQ-135 raw</th>
                      </tr>
                    </thead>

                    <tbody>
                      {varietyComparison.map((item) => (
                        <tr key={item.variety}>
                          <td>{item.variety}</td>
                          <td>{item.samples}</td>
                          <td>
                            {item.averageTemperature === null
                              ? "—"
                              : displayNumber(
                                  item.averageTemperature
                                )}
                          </td>
                          <td>
                            {item.averageHumidity === null
                              ? "—"
                              : displayNumber(
                                  item.averageHumidity
                                )}
                          </td>
                          <td>
                            {item.averageMQ135 === null
                              ? "—"
                              : displayNumber(
                                  item.averageMQ135,
                                  0
                                )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="research-note">
                  <div className="note-icon">
                    <Target size={20} />
                  </div>
                  <div>
                    <h3>How to interpret this comparison</h3>
                    <p>
                      These are descriptive averages of the
                      records currently entered. Differences
                      do not establish that a variety is riper
                      or that the sensor can classify ripeness.
                      That requires sufficient samples,
                      reference labels and appropriate
                      statistical or machine learning
                      evaluation.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          )}

          <footer className="app-footer">
            <span>Pineapple AI Management System</span>
            <span>
              Smart monitoring · Gas sensing · Environmental
              analysis · AI
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;
