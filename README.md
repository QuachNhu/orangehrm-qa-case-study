# OrangeHRM QA Case Study

Software testing case study on [OrangeHRM](https://github.com/orangehrm/orangehrm) 5.x, an open-source HR management system, self-hosted with Docker.

Course project for Software Testing (CSC13003), University of Science, VNU-HCM, Nov 2025 – Feb 2026. It was a group project; this repository contains **my individual part**.

**Modules tested:** PIM (Employee Management), ESS (My Info – Contact Details), Claim

## At a glance

| Area | What was done | Tools |
|---|---|---|
| Test design | 97 test cases using domain testing, pairwise testing, state transition and decision table | Excel |
| GUI / cross-browser | Checklists of 30+ items for *Add Employee* and *Claim*, run on Chrome, Firefox and Edge | axe DevTools |
| Test automation | 93 data-driven tests, each run on Chromium, Firefox and WebKit (279 runs) | Playwright, TypeScript |
| Performance | Load, stress and spike tests on the *Search Employee* flow, with CSV data and CSRF token handling | Apache JMeter |
| Test data | Script that fills the database with 100 employees, job titles, departments and claims | Node.js, Faker.js |

## Repository structure

```
.
├── docker-compose.yml               # OrangeHRM (:8080) + MariaDB (:3306)
├── test-design/
│   ├── test-cases.xlsx              # 97 test cases with steps, expected/actual results
│   └── Test_design_report.pdf       # How each black-box technique was applied
├── gui-testing/
│   ├── gui-checklist.xlsx           # GUI checklists for Add Employee and Claim
│   └── CrossBrowser_testing_report.pdf
├── automation/                      # Playwright project
│   ├── tests/                       # One spec file per feature
│   ├── tests/data/                  # JSON test data and upload fixtures
│   ├── utils/config.ts              # Login credentials (overridable by env vars)
│   └── Automation_testing_report.pdf
├── performance/
│   ├── orangehrm_search_employee.jmx
│   ├── search_data.csv              # Search keywords for data-driven requests
│   ├── results/load_test_summary.csv
│   └── Performance_testing_report.pdf
└── data-generation/
    ├── src/generate-data.js
    └── Test_generation_report.pdf
```

> The reports and test case descriptions are written in Vietnamese.

## Automated tests

| Spec file | Feature | Technique | Tests |
|---|---|---|---|
| `PIM_AddEmployee.spec.ts` | Add Employee | Domain testing | 10 |
| `PIM_SearchEmployee.spec.ts` | Search Employee | Pairwise testing | 18 |
| `PIM_StatusEmployee.spec.ts` | Employee status lifecycle | State transition | 1 flow |
| `PIM_AssignedSupervisors.spec.ts` | Assign supervisors | Decision table | 7 |
| `ESS_DetailEmployee.spec.ts` | My Info – Contact Details | Domain testing | 42 |
| `ESS_Claim.spec.ts` | Claim request lifecycle | State transition | 15 |

Test inputs for the data-driven specs live in `tests/data/*.json`, so a new case only needs a new JSON entry.

## How to run

Requirements: Docker Desktop, Node.js 18+, and Apache JMeter 5.6 for the performance tests.

**1. Start OrangeHRM**

```bash
docker compose up -d
```

Open http://localhost:8080 and complete the installation wizard:
- Database host: `db`
- Database name: `orangehrm`
- Database user and password: `orangehrm` / `orangehrm`
- Admin account: `admin` / `Admin@12345`

**2. Generate test data**

This step creates employees `EMP001`–`EMP100` (password `Admin@12345`), plus job titles, departments, employment statuses and claims.

> **Warning:** the script deletes existing employees first.

```bash
cd data-generation
npm install
npm run generate
```

**3. Run the Playwright tests**

```bash
cd automation
npm ci
npx playwright install
npm test                  # all 3 browsers
npm run test:chromium     # Chromium only
npm run report            # open the HTML report
```

You can override the defaults with the environment variables `BASE_URL`, `ORANGEHRM_ADMIN_USER` and `ORANGEHRM_PASSWORD`.

**4. Run the JMeter test plan**

Open `performance/orangehrm_search_employee.jmx` in JMeter, set the Thread Group to the scenario you want, and start the run. The thread group settings for each scenario are listed below and in the report.

> The employee names in `search_data.csv` come from one run of the data generator, which produces random names. Replace them with names from your own database, otherwise the search requests return no results.

| Scenario | Users | Ramp-up | Loops |
|---|---|---|---|
| Load | 50 | 10 s | 10 |
| Stress | 200 | 20 s | Infinite |
| Spike | 200 | 0 s | 1 |

## Selected findings

- **Data integrity:** name fields on *Add Employee* save leading and trailing spaces without trimming them.
- **Accessibility:** the *Cancel* button has a contrast ratio of 2.33:1 (WCAG AA requires 4.5:1), and form inputs are missing associated labels (reported by axe DevTools).
- **Performance** (local Docker, i5-1135G7, 16 GB RAM):
  - **Load, 50 users:** 0% errors and about 37 req/s, but the login request averaged 4.2 s. Details in `results/load_test_summary.csv`.
  - **Stress:** errors and response times over 10 s started at about 180–200 users.
  - **Spike, 200 users at once:** high error rate and slow recovery.
