# Setup and Execution Guide

This document describes how to execute the Inverted Pendulum State-Feedback Stabilization Project across all environments:
1. Python FastAPI Backend
2. Modern Web Simulation Dashboard (Frontend)
3. MATLAB Pipeline
4. Simulink Dynamic Simulation

---

## 1. Directory Structure

```
inverted-pendulum-project/
├── backend/                  # Python FastAPI computation & simulation engine
│   ├── main.py               # REST API server
│   ├── parameters.py         # Physical parameters model
│   ├── nonlinear_model.py    # Lagrangian derivation & nonlinear ODE RHS
│   ├── linearized_model.py   # Small-angle state-space matrices A, B, C, D
│   ├── controllability.py    # Controllability matrix C and rank
│   ├── ackermann_controller.py # Manual Ackermann formula implementation
│   ├── simulation.py         # Runge-Kutta 45 integration & test suite
│   └── performance_analysis.py # Transient/steady-state performance analysis
├── frontend/                 # React + TypeScript + Tailwind web application
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
├── matlab/                   # Modular MATLAB codebase
│   ├── main.m                # Master execution workflow
│   ├── parameters.m
│   ├── nonlinear_model.m
│   ├── linearized_model.m
│   ├── controllability.m
│   ├── ackermann_controller.m # Manual Ackermann code (no acker dependence)
│   ├── simulation.m
│   ├── performance_analysis.m
│   └── plotting.m
├── simulink/                 # Simulink model setup & block specifications
│   ├── setup_simulink.m      # Workspace initialization script
│   └── simulink_model_guide.md # Block interconnection & configuration guide
└── documentation/            # Academic documentation & reference sheets
    ├── project_report.md     # Undergraduate thesis-level engineering report
    ├── equations.md          # Consolidated mathematical reference
    └── setup_guide.md        # This guide
```

---

## 2. Running the Python Backend

### Requirements
- Python 3.9+
- Libraries: `numpy`, `scipy`, `sympy`, `fastapi`, `uvicorn`

### Execution
From the root directory:
```bash
cd backend
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Once running:
- API Documentation (Swagger UI): `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/api/health`

---

## 3. Running the Web Frontend

### Requirements
- Node.js 18+
- npm 9+

### Execution
From the root directory:
```bash
cd frontend
npm install
npm run dev
```

Open your browser at `http://localhost:5173`.

> [!NOTE]
> The frontend contains a built-in mathematical engine and RK4 solver that operates independently in the browser and automatically connects to the backend API when available.

---

## 4. Running the MATLAB Pipeline

1. Launch MATLAB.
2. Set the working directory to `matlab/`.
3. In the Command Window, run:
   ```matlab
   main
   ```
4. This script executes all 7 engineering phases sequentially:
   - Loads physical parameters
   - Linearizes the system and calculates eigenvalues
   - Analyzes controllability and verifies rank = 4
   - Computes state-feedback gain $K$ using manual Ackermann's formula
   - Simulates all 4 test conditions with `ode45`
   - Generates performance metrics and comparison table
   - Plots publication-grade figures.

---

## 5. Running the Simulink Model

1. Open MATLAB and navigate to `simulink/`.
2. Run the initialization script:
   ```matlab
   setup_simulink
   ```
3. Follow the instructions in `simulink/simulink_model_guide.md` to run the model.
