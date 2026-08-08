import {
  createDirectionalDriverIdMap,
  getDirectionalDriverId,
} from "../directionalDriverIdMap";

describe("directionalDriverIdMap", () => {
  test("同じ号車の行きと帰りを別のDriver IDとして保持する", () => {
    const driverIdMap = createDirectionalDriverIdMap([
      { id: 101, availabilityDriverId: 7, direction: "outbound" },
      { id: 202, availabilityDriverId: 7, direction: "inbound" },
    ]);

    expect(getDirectionalDriverId(driverIdMap, 7, "outbound")).toBe(101);
    expect(getDirectionalDriverId(driverIdMap, 7, "inbound")).toBe(202);
  });

  test("同じ子供でも行きと帰りで異なるDriver IDへ割り当てられる", () => {
    const driverIdMap = createDirectionalDriverIdMap([
      { id: 101, availabilityDriverId: 7, direction: "outbound" },
      { id: 202, availabilityDriverId: 7, direction: "inbound" },
    ]);
    const childId = 55;

    const assignments = (["outbound", "inbound"] as const).map((direction) => ({
      driverId: getDirectionalDriverId(driverIdMap, 7, direction),
      childId,
    }));

    expect(assignments).toEqual([
      { driverId: 101, childId: 55 },
      { driverId: 202, childId: 55 },
    ]);
  });

  test("帰りが空でも行きの子供は行きのDriver IDへ割り当てられる", () => {
    const driverIdMap = createDirectionalDriverIdMap([
      { id: 101, availabilityDriverId: 7, direction: "outbound" },
      { id: 202, availabilityDriverId: 7, direction: "inbound" },
    ]);

    const outboundAssignment = {
      driverId: getDirectionalDriverId(driverIdMap, 7, "outbound"),
      childId: 55,
    };

    expect(outboundAssignment).toEqual({ driverId: 101, childId: 55 });
  });

  test("引率者も同じ回答IDを方向別のDriver IDとして保持する", () => {
    const escortIdMap = createDirectionalDriverIdMap([
      { id: 303, availabilityDriverId: 9, direction: "outbound" },
      { id: 404, availabilityDriverId: 9, direction: "inbound" },
    ]);

    expect(getDirectionalDriverId(escortIdMap, 9, "outbound")).toBe(303);
    expect(getDirectionalDriverId(escortIdMap, 9, "inbound")).toBe(404);
  });

  test("direction未指定は既存仕様どおり行きとして扱う", () => {
    const driverIdMap = createDirectionalDriverIdMap([
      { id: 101, availabilityDriverId: 7 },
    ]);

    expect(getDirectionalDriverId(driverIdMap, 7, "outbound")).toBe(101);
  });

  test("対応するDriver IDがない場合は保存処理を止める", () => {
    expect(() => getDirectionalDriverId(new Map(), 7, "inbound")).toThrow(
      "作成した配車のIDを特定できませんでした",
    );
  });
});
