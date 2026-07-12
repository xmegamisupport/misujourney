// Standalone regression check for the inventory engine (src/lib/inventory/engine.ts).
// Runs the exact scenarios from the product spec ("十九、需要建立的测试情境") against a
// tiny in-memory localStorage/window polyfill, using Node's native TypeScript support.
// Run with: node scripts/verify-inventory.mjs

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};
globalThis.window = {
  dispatchEvent: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
};

const engine = await import("../src/lib/inventory/engine.ts");
const { getInventoryAlertStatus } = await import("../src/lib/inventory/constants.ts");

let passCount = 0;
let failCount = 0;

function assert(label, condition, detail) {
  if (condition) {
    passCount++;
    console.log(`  ✓ ${label}`);
  } else {
    failCount++;
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function remaining(customerId, productCode) {
  const row = engine.getCustomerInventoryList(customerId).find((r) => r.productCode === productCode);
  return row ? row.remainingUnits : 0;
}

function section(title) {
  console.log(`\n${title}`);
}

// ---------- 1. 注册库存 ----------
section("1. 注册库存：代餐3盒 + 排毒2盒");
{
  const r = engine.initializeInventoryFromRegistration(
    "test-cust-1",
    { MISU_N_PLUS: 3, MISU_DX_PLUS: 2 },
    "customer",
  );
  assert("engine call succeeds", r.ok);
  assert("代餐初始库存 = 60", remaining("test-cust-1", "MISU_N_PLUS") === 60, remaining("test-cust-1", "MISU_N_PLUS"));
  assert("排毒初始库存 = 40", remaining("test-cust-1", "MISU_DX_PLUS") === 40, remaining("test-cust-1", "MISU_DX_PLUS"));
}

// ---------- 2. 正常打卡扣库存 ----------
section("2. 正常打卡扣库存：代餐-2 排毒-1");
const checkin1Id = "checkin-1";
{
  const r = engine.submitCheckIn({
    id: checkin1Id,
    customerId: "test-cust-1",
    date: "2026-07-12",
    weight: 60,
    poopCount: "1",
    bedtime: "23:00",
    wakeTime: "07:00",
    usage: [
      { productCode: "MISU_N_PLUS", quantity: 2 },
      { productCode: "MISU_DX_PLUS", quantity: 1 },
    ],
    createdBy: "customer",
  });
  assert("engine call succeeds", r.ok, r.error);
  assert("代餐剩余 58", remaining("test-cust-1", "MISU_N_PLUS") === 58, remaining("test-cust-1", "MISU_N_PLUS"));
  assert("排毒剩余 39", remaining("test-cust-1", "MISU_DX_PLUS") === 39, remaining("test-cust-1", "MISU_DX_PLUS"));
}

// ---------- 3. 重复提交同一笔打卡 ----------
section("3. 重复提交同一笔打卡（同一 checkInId）");
{
  const r = engine.submitCheckIn({
    id: checkin1Id,
    customerId: "test-cust-1",
    date: "2026-07-12",
    weight: 60,
    poopCount: "1",
    bedtime: "23:00",
    wakeTime: "07:00",
    usage: [
      { productCode: "MISU_N_PLUS", quantity: 2 },
      { productCode: "MISU_DX_PLUS", quantity: 1 },
    ],
    createdBy: "customer",
  });
  assert("重复提交返回成功但不重复处理", r.ok);
  assert("代餐库存仍是 58（没有被再扣一次）", remaining("test-cust-1", "MISU_N_PLUS") === 58, remaining("test-cust-1", "MISU_N_PLUS"));
  assert("排毒库存仍是 39（没有被再扣一次）", remaining("test-cust-1", "MISU_DX_PLUS") === 39, remaining("test-cust-1", "MISU_DX_PLUS"));
}

// ---------- 4. 编辑打卡：减少数量 ----------
section("4. 编辑打卡：代餐 2 包 → 1 包，应退回 1 包");
{
  const r = engine.editCheckIn(
    "test-cust-1",
    checkin1Id,
    { weight: 60, poopCount: "1", bedtime: "23:00", wakeTime: "07:00", usage: [{ productCode: "MISU_N_PLUS", quantity: 1 }, { productCode: "MISU_DX_PLUS", quantity: 1 }] },
    "customer",
  );
  assert("engine call succeeds", r.ok, r.error);
  assert("代餐剩余回到 59", remaining("test-cust-1", "MISU_N_PLUS") === 59, remaining("test-cust-1", "MISU_N_PLUS"));
}

// ---------- 5. 编辑打卡：增加数量 ----------
section("5. 编辑打卡：代餐 1 包 → 3 包，应再扣 2 包");
{
  const r = engine.editCheckIn(
    "test-cust-1",
    checkin1Id,
    { weight: 60, poopCount: "1", bedtime: "23:00", wakeTime: "07:00", usage: [{ productCode: "MISU_N_PLUS", quantity: 3 }, { productCode: "MISU_DX_PLUS", quantity: 1 }] },
    "customer",
  );
  assert("engine call succeeds", r.ok, r.error);
  assert("代餐剩余降到 57", remaining("test-cust-1", "MISU_N_PLUS") === 57, remaining("test-cust-1", "MISU_N_PLUS"));
}

// ---------- 6. 删除打卡 ----------
section("6. 删除打卡：应退回代餐3包、排毒1包");
{
  const before = { n: remaining("test-cust-1", "MISU_N_PLUS"), dx: remaining("test-cust-1", "MISU_DX_PLUS") };
  const r = engine.deleteCheckIn("test-cust-1", checkin1Id, "customer");
  assert("engine call succeeds", r.ok, r.error);
  assert("代餐退回 3 包", remaining("test-cust-1", "MISU_N_PLUS") === before.n + 3, remaining("test-cust-1", "MISU_N_PLUS"));
  assert("排毒退回 1 包", remaining("test-cust-1", "MISU_DX_PLUS") === before.dx + 1, remaining("test-cust-1", "MISU_DX_PLUS"));
  assert("打卡记录已从列表移除", !engine.getCheckInsForCustomer("test-cust-1").some((c) => c.id === checkin1Id));
}

// ---------- 7. 库存不足 ----------
section("7. 库存不足：剩余代餐 1 包，却提交使用 2 包");
{
  engine.manualAdjustment("test-cust-1", "MISU_N_PLUS", -(remaining("test-cust-1", "MISU_N_PLUS") - 1), "测试：调整到只剩1包", "admin");
  assert("准备条件：代餐剩余 1 包", remaining("test-cust-1", "MISU_N_PLUS") === 1, remaining("test-cust-1", "MISU_N_PLUS"));

  const r = engine.submitCheckIn({
    id: "checkin-insufficient",
    customerId: "test-cust-1",
    date: "2026-07-13",
    weight: 60,
    poopCount: "0",
    bedtime: "23:00",
    wakeTime: "07:00",
    usage: [{ productCode: "MISU_N_PLUS", quantity: 2 }],
    createdBy: "customer",
  });
  assert("系统阻止提交", r.ok === false);
  assert(
    "错误信息符合规格模板",
    r.error === "你的MISU N+ 代餐目前只剩1包，无法记录使用2包，请检查数量或先更新回购库存。",
    r.error,
  );
  assert("库存没有被扣成负数", remaining("test-cust-1", "MISU_N_PLUS") === 1);
}

// ---------- 8 & 9. 回购提醒触发 ----------
section("8. 代餐从 11 包扣至 10 包时触发回购提醒");
{
  engine.manualAdjustment("test-cust-1", "MISU_N_PLUS", 10, "测试：补到11包", "admin");
  assert("准备条件：代餐剩余 11 包（充足）", remaining("test-cust-1", "MISU_N_PLUS") === 11);
  assert("状态为 SUFFICIENT", getInventoryAlertStatus("MISU_N_PLUS", 11) === "SUFFICIENT");

  engine.submitCheckIn({
    id: "checkin-trigger-n",
    customerId: "test-cust-1",
    date: "2026-07-14",
    weight: 60,
    poopCount: "0",
    bedtime: "23:00",
    wakeTime: "07:00",
    usage: [{ productCode: "MISU_N_PLUS", quantity: 1 }],
    createdBy: "customer",
  });
  assert("代餐剩余 10 包", remaining("test-cust-1", "MISU_N_PLUS") === 10);
  const alerts = engine.getAlertsForCustomer("test-cust-1").filter((a) => a.productCode === "MISU_N_PLUS" && a.status === "OPEN");
  assert("生成了一条 OPEN 的 REPURCHASE_SOON 提醒", alerts.length === 1 && alerts[0].alertLevel === "REPURCHASE_SOON", JSON.stringify(alerts));
}

section("9. 排毒从 21 包扣至 20 包时触发回购提醒");
{
  engine.initializeLegacyBalance("test-cust-2", { MISU_DX_PLUS: 21 }, "customer");
  engine.submitCheckIn({
    id: "checkin-trigger-dx",
    customerId: "test-cust-2",
    date: "2026-07-14",
    weight: 55,
    poopCount: "1",
    bedtime: "22:30",
    wakeTime: "06:30",
    usage: [{ productCode: "MISU_DX_PLUS", quantity: 1 }],
    createdBy: "customer",
  });
  assert("排毒剩余 20 包", remaining("test-cust-2", "MISU_DX_PLUS") === 20);
  const alerts = engine.getAlertsForCustomer("test-cust-2").filter((a) => a.productCode === "MISU_DX_PLUS" && a.status === "OPEN");
  assert("生成了一条 OPEN 的 REPURCHASE_SOON 提醒", alerts.length === 1 && alerts[0].alertLevel === "REPURCHASE_SOON", JSON.stringify(alerts));
}

// ---------- 10. 提醒升级，不重复建立 ----------
section("10. 提醒升级：代餐从 10 包降到 5 包，升级为 URGENT，不新增提醒");
{
  for (let i = 0; i < 5; i++) {
    engine.submitCheckIn({
      id: `checkin-downgrade-${i}`,
      customerId: "test-cust-1",
      date: `2026-07-${15 + i}`,
      weight: 60,
      poopCount: "0",
      bedtime: "23:00",
      wakeTime: "07:00",
      usage: [{ productCode: "MISU_N_PLUS", quantity: 1 }],
      createdBy: "customer",
    });
  }
  assert("代餐剩余 5 包", remaining("test-cust-1", "MISU_N_PLUS") === 5, remaining("test-cust-1", "MISU_N_PLUS"));
  const nAlerts = engine.getAlertsForCustomer("test-cust-1").filter((a) => a.productCode === "MISU_N_PLUS");
  const openAlerts = nAlerts.filter((a) => a.status === "OPEN" || a.status === "FOLLOWED_UP");
  assert("只有一条活跃提醒（没有重复建立）", openAlerts.length === 1, JSON.stringify(nAlerts));
  assert("提醒等级已升级为 URGENT", openAlerts[0]?.alertLevel === "URGENT", JSON.stringify(openAlerts));
}

// ---------- 11. 新增回购 ----------
section("11. 新增回购：代餐剩余 5 包，回购 2 盒 → 45 包，提醒变已完成");
{
  const r = engine.recordRepurchase("test-cust-1", "MISU_N_PLUS", 2, undefined, "测试回购", "coach-001");
  assert("engine call succeeds", r.ok, r.error);
  assert("代餐剩余 45 包", remaining("test-cust-1", "MISU_N_PLUS") === 45, remaining("test-cust-1", "MISU_N_PLUS"));
  const nAlerts = engine.getAlertsForCustomer("test-cust-1").filter((a) => a.productCode === "MISU_N_PLUS");
  const stillOpen = nAlerts.filter((a) => a.status === "OPEN" || a.status === "FOLLOWED_UP");
  assert("原提醒已变成 COMPLETED，没有残留 OPEN 提醒", stillOpen.length === 0, JSON.stringify(nAlerts));
}

// ---------- 12. 旧顾客补登库存 ----------
section("12. 旧顾客：没有库存资料时可以先补登目前剩余包数");
{
  assert("旧顾客一开始没有库存记录", engine.hasInventoryRecords("legacy-cust") === false);
  const r = engine.initializeLegacyBalance("legacy-cust", { MISU_N_PLUS: 18, MISU_DX_PLUS: 12 }, "customer");
  assert("补登成功", r.ok, r.error);
  assert("代餐剩余 18 包", remaining("legacy-cust", "MISU_N_PLUS") === 18);
  assert("排毒剩余 12 包", remaining("legacy-cust", "MISU_DX_PLUS") === 12);
  assert("补登后有库存记录了，可以继续打卡", engine.hasInventoryRecords("legacy-cust") === true);
}

// ---------- 13. Smart Meal Check 记录 MISU 使用（新流程） ----------
section("13. Smart Meal Check：确认餐点后扣库存，且按 mealId 幂等");
{
  engine.initializeInventoryFromRegistration("meal-cust", { MISU_N_PLUS: 3, MISU_DX_PLUS: 2 }, "customer");
  assert("准备条件：代餐 60 包，排毒 40 包", remaining("meal-cust", "MISU_N_PLUS") === 60 && remaining("meal-cust", "MISU_DX_PLUS") === 40);

  const mealId = "meal-breakfast-1";
  const usage = [
    { productCode: "MISU_N_PLUS", quantity: 1 },
    { productCode: "MISU_DX_PLUS", quantity: 0 },
  ];

  const first = engine.recordMealMisuUsage({ mealId, customerId: "meal-cust", misuItems: usage, createdBy: "customer" });
  assert("首次记录成功", first.ok, first.error);
  assert("代餐扣到 59 包（DX+ 数量为0，不受影响）", remaining("meal-cust", "MISU_N_PLUS") === 59 && remaining("meal-cust", "MISU_DX_PLUS") === 40);

  const second = engine.recordMealMisuUsage({ mealId, customerId: "meal-cust", misuItems: usage, createdBy: "customer" });
  assert("同一个 mealId 重复调用返回成功但不重复处理", second.ok);
  assert("代餐库存仍是 59 包（没有被再扣一次）", remaining("meal-cust", "MISU_N_PLUS") === 59);
}

section("14. Smart Meal Check：库存不足时阻止记录");
{
  engine.manualAdjustment("meal-cust", "MISU_DX_PLUS", -39, "测试：调整到只剩1包", "admin");
  assert("准备条件：排毒剩余 1 包", remaining("meal-cust", "MISU_DX_PLUS") === 1);

  const r = engine.recordMealMisuUsage({
    mealId: "meal-bedtime-1",
    customerId: "meal-cust",
    misuItems: [{ productCode: "MISU_DX_PLUS", quantity: 2 }],
    createdBy: "customer",
  });
  assert("系统阻止提交", r.ok === false);
  assert("排毒库存没有被扣成负数，仍是 1 包", remaining("meal-cust", "MISU_DX_PLUS") === 1);
}

console.log(`\n${"=".repeat(50)}`);
console.log(`通过 ${passCount} 项，失败 ${failCount} 项`);
if (failCount > 0) {
  process.exit(1);
}
