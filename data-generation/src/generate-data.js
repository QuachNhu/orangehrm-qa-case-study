import { faker } from '@faker-js/faker';
import mysql from 'mysql2/promise';

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'root', 
    database: 'orangehrm',
    port: 3306
};

const PLAIN_PASSWORD = '$2y$12$pMfxvUA2ZPFVTnDSI/uowew0DagTevgIixZqzrxzDdVFR9rvVi6J6';

const MASTER = {
    jobs: [
        { id: 1, title: 'QA Engineer', desc: 'Responsible for software quality assurance' },
        { id: 2, title: 'Sales Manager', desc: 'Managing sales and customer relations' },
        { id: 3, title: 'Software Engineer', desc: 'Developing and maintaining software applications' },
        { id: 4, title: 'IT Support', desc: 'Providing technical assistance and support' },
        { id: 5, title: 'Product Manager', desc: 'Overseeing product development life cycle' },
        { id: 6, title: 'Accountant', desc: 'Handling financial records and taxes' },
        { id: 7, title: 'HR Manager', desc: 'Managing human resources and recruitment' }
    ],
    subunits: [
        { id: 6, name: 'QA Department', unitId: '6', lft: 11, rgt: 12, level: 1 },
        { id: 7, name: 'Sales Department', unitId: '7', lft: 13, rgt: 14, level: 1 },
        { id: 8, name: 'Engineering', unitId: '8', lft: 15, rgt: 18, level: 1 },
        { id: 9, name: 'Software Dev', unitId: '9', lft: 16, rgt: 17, level: 2 },
        { id: 12, name: 'IT Department', unitId: '12', lft: 19, rgt: 22, level: 1 },
        { id: 13, name: 'DevOps Team', unitId: '13', lft: 20, rgt: 21, level: 2 },
        { id: 14, name: 'Product Department', unitId: '14', lft: 23, rgt: 24, level: 1 },
        { id: 15, name: 'Accounting Department', unitId: '15', lft: 25, rgt: 26, level: 1 },
        { id: 16, name: 'Branch A', unitId: '16', lft: 27, rgt: 28, level: 1 },
        { id: 17, name: 'Branch B', unitId: '17', lft: 29, rgt: 30, level: 1 },
        { id: 18, name: 'Human Resources', unitId: '18', lft: 31, rgt: 32, level: 1 }
    ],
    // 4 loại hình theo yêu cầu mới
    statuses: ['Full-Time', 'Part-Time', 'Freelance', 'Probation'],
    claimStatuses: ['INITIATED', 'SUBMITTED', 'APPROVED', 'REJECTED']
};

let REFS = { jobs: [], statuses: [], subunits: [], essRoleId: 2 };

async function main() {
    let conn;
    try {
        console.log('START: Initializing data generation for 100 employees...');
        conn = await mysql.createConnection(dbConfig);

        await cleanData(conn);
        await createMasterData(conn);

        // ĐỊNH NGHĨA 18 TỔ HỢP PAIRWISE ĐỂ ĐẢM BẢO SEARCH RA KẾT QUẢ
        // Note: 'Past Only' sẽ kích hoạt terminateEmployee
        const combos = [
            { jt: 'Software Engineer', su: 'Engineering', es: 'Full-Time', inc: 'Current Only' },
            { jt: 'Software Engineer', su: 'Software Dev', es: 'Part-Time', inc: 'Current & Past' },
            { jt: 'Software Engineer', su: 'Sales Department', es: 'Freelance', inc: 'Past Only' },
            { jt: 'Software Engineer', su: 'Branch A', es: 'Probation', inc: 'Current Only' },
            { jt: 'QA Engineer', su: 'Engineering', es: 'Part-Time', inc: 'Past Only' },
            { jt: 'QA Engineer', su: 'Software Dev', es: 'Full-Time', inc: 'Current Only' },
            { jt: 'QA Engineer', su: 'Sales Department', es: 'Probation', inc: 'Current & Past' },
            { jt: 'QA Engineer', su: 'Branch A', es: 'Freelance', inc: 'Current & Past' },
            { jt: 'Sales Manager', su: 'Engineering', es: 'Freelance', inc: 'Current & Past' },
            { jt: 'Sales Manager', su: 'Software Dev', es: 'Probation', inc: 'Past Only' },
            { jt: 'Sales Manager', su: 'Sales Department', es: 'Full-Time', inc: 'Current Only' },
            { jt: 'Sales Manager', su: 'Branch A', es: 'Part-Time', inc: 'Past Only' },
            { jt: 'HR Manager', su: 'Engineering', es: 'Probation', inc: 'Current Only' },
            { jt: 'HR Manager', su: 'Software Dev', es: 'Freelance', inc: 'Current Only' },
            { jt: 'HR Manager', su: 'Sales Department', es: 'Part-Time', inc: 'Current & Past' },
            { jt: 'HR Manager', su: 'Branch A', es: 'Full-Time', inc: 'Past Only' },
            { jt: 'Software Engineer', su: 'Engineering', es: 'Probation', inc: 'Current & Past' },
            { jt: 'QA Engineer', su: 'Software Dev', es: 'Freelance', inc: 'Current Only' }
        ];

        const empNumbers = [];

        // 1. Tạo 18 nhân viên đáp ứng đúng logic Pairwise
        console.log('STEP 3: Generating 18 target employees for Pairwise tests...');
        for (let i = 0; i < combos.length; i++) {
            const c = combos[i];
            const empIdStr = `EMP${String(i + 1).padStart(3, '0')}`;
            const jobId = REFS.jobs.find(j => j.name === c.jt)?.id;
            const subId = REFS.subunits.find(s => s.name === c.su)?.id;
            const statusId = REFS.statuses.find(s => s.name === c.es)?.id;

            const empNum = await insertEmployee(conn, {
                empId: empIdStr,
                first: faker.person.firstName(),
                last: `Target_${c.es.replace('-', '')}`,
                job: jobId,
                sub: subId,
                stat: statusId
            });

            empNumbers.push({ num: empNum, id: empIdStr });

            // Logic sa thải nếu là Past Only để khi lọc "Past Only" sẽ ra kết quả
            if (c.inc === 'Past Only') {
                await terminateEmployee(conn, empNum, '2024-12-01');
            }
        }

        // 2. Tạo thêm 82 nhân viên ngẫu nhiên để đủ 100
        console.log('STEP 4: Generating 82 random employees to reach total 100...');
        for (let i = 19; i <= 100; i++) {
            const empIdStr = `EMP${String(i).padStart(3, '0')}`;
            const randJob = REFS.jobs[Math.floor(Math.random() * REFS.jobs.length)];
            const randSub = REFS.subunits[Math.floor(Math.random() * REFS.subunits.length)];
            const randStat = REFS.statuses[Math.floor(Math.random() * REFS.statuses.length)];

            const empNum = await insertEmployee(conn, {
                empId: empIdStr,
                first: faker.person.firstName(),
                last: faker.person.lastName(),
                job: randJob.id,
                sub: randSub.id,
                stat: randStat.id
            });
            empNumbers.push({ num: empNum, id: empIdStr });
        }

        await createClaimData(conn, empNumbers);
        console.log('SUCCESS: 100 employees created (18 Target + 82 Random).');

    } catch (err) {
        console.error('FATAL ERROR:', err);
    } finally {
        if (conn) await conn.end();
    }
}

async function cleanData(conn) {
    console.log('STEP 1: Cleaning existing data...');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    await conn.query("DELETE FROM ohrm_user WHERE user_name != 'Admin'");
    await conn.query("DELETE FROM hs_hr_employee WHERE emp_number > 1");
    const tables = ['ohrm_emp_termination', 'ohrm_job_title', 'ohrm_subunit', 'ohrm_employment_status', 'ohrm_claim_request'];
    for (const t of tables) {
        if (t === 'ohrm_subunit') await conn.query("DELETE FROM ohrm_subunit WHERE id > 1");
        else await conn.query(`DELETE FROM ${t}`);
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
}

async function createMasterData(conn) {
    console.log('STEP 2: Setting up Master Data...');
    await conn.execute("UPDATE ohrm_subunit SET lft = 1, rgt = 100, level = 0 WHERE id = 1");

    for (const j of MASTER.jobs) {
        await conn.execute('INSERT INTO ohrm_job_title (id, job_title, is_deleted) VALUES (?, ?, 0)', [j.id, j.title]);
        REFS.jobs.push({ id: j.id, name: j.title });
    }
    for (const sub of MASTER.subunits) {
        await conn.execute('INSERT INTO ohrm_subunit (id, name, unit_id, lft, rgt, level) VALUES (?, ?, ?, ?, ?, ?)', [sub.id, sub.name, sub.unitId, sub.lft, sub.rgt, sub.level]);
        REFS.subunits.push({ id: sub.id, name: sub.name });
    }
    for (const s of MASTER.statuses) {
        const [res] = await conn.execute('INSERT INTO ohrm_employment_status (name) VALUES (?)', [s]);
        REFS.statuses.push({ name: s, id: res.insertId });
    }
    const [roles] = await conn.execute("SELECT id FROM ohrm_user_role WHERE name = 'ESS'");
    REFS.essRoleId = roles.length > 0 ? roles[0].id : 2;
}

async function insertEmployee(conn, data) {
    const [res] = await conn.execute(
        `INSERT INTO hs_hr_employee (employee_id, emp_firstname, emp_lastname, job_title_code, work_station, emp_status, joined_date) 
         VALUES (?, ?, ?, ?, ?, ?, '2025-01-01')`,
        [data.empId, data.first, data.last, data.job, data.sub, data.stat]
    );
    const empNumber = res.insertId;
    await conn.execute(
        `INSERT INTO ohrm_user (user_role_id, emp_number, user_name, user_password, deleted, status, date_entered) 
         VALUES (?, ?, ?, ?, 0, 1, NOW())`,
        [REFS.essRoleId, empNumber, data.empId, PLAIN_PASSWORD]
    );
    return empNumber;
}

async function terminateEmployee(conn, empNumber, date) {
    const [res] = await conn.execute('INSERT INTO ohrm_emp_termination (emp_number, reason_id, termination_date) VALUES (?, 1, ?)', [empNumber, date]);
    await conn.execute('UPDATE hs_hr_employee SET termination_id = ? WHERE emp_number = ?', [res.insertId, empNumber]);
}

async function createClaimData(conn, employees) {
    const [evRes] = await conn.execute("INSERT INTO ohrm_claim_event (name, status, is_deleted) VALUES ('System Test', 1, 0)");
    const [typeRes] = await conn.execute("INSERT INTO ohrm_expense_type (name, status, is_deleted) VALUES ('Business Travel', 1, 0)");
    for (let i = 0; i < 40; i++) {
        const emp = employees[i % employees.length];
        await conn.execute(
            `INSERT INTO ohrm_claim_request (emp_number, reference_id, event_type_id, status, currency_id, created_date, is_deleted) 
             VALUES (?, ?, ?, 'SUBMITTED', 'USD', NOW(), 0)`,
            [emp.num, `REF-${emp.id}-${i}`, evRes.insertId]
        );
    }
}

main();