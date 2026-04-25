import { calculateTDEE, calculateMacros } from "@/lib/nutrition/tdee";

describe("TDEE Calculation (TES-150: pregnancy & breastfeeding)", () => {
  const baseBio = {
    weight_kg: 70,
    height_cm: 170,
    age: 30,
    sex: "female" as const,
    activity_level: "moderate",
  };

  test("Base TDEE for non-pregnant female", () => {
    const tdee = calculateTDEE(baseBio);
    // BMR: 10*70 + 6.25*170 - 5*30 - 161 = 700 + 1062.5 - 150 - 161 = 1451.5
    // TDEE: 1451.5 * 1.55 = 2249.825 ≈ 2250
    expect(tdee).toBeCloseTo(2250, -2);
  });

  test("TDEE increases by +340 kcal for pregnant (trimester 2)", () => {
    const tdeeNormal = calculateTDEE(baseBio) ?? 0;
    const tdeePregnantT2 = calculateTDEE({
      ...baseBio,
      is_pregnant: true,
      pregnancy_trimester: 2,
    }) ?? 0;
    expect(tdeePregnantT2 - tdeeNormal).toBe(340);
  });

  test("TDEE increases by +452 kcal for pregnant (trimester 3)", () => {
    const tdeeNormal = calculateTDEE(baseBio) ?? 0;
    const tdeePregnantT3 = calculateTDEE({
      ...baseBio,
      is_pregnant: true,
      pregnancy_trimester: 3,
    }) ?? 0;
    expect(tdeePregnantT3 - tdeeNormal).toBe(452);
  });

  test("TDEE increases by +0 kcal for pregnant (trimester 1)", () => {
    const tdeeNormal = calculateTDEE(baseBio) ?? 0;
    const tdeePregnantT1 = calculateTDEE({
      ...baseBio,
      is_pregnant: true,
      pregnancy_trimester: 1,
    }) ?? 0;
    expect(tdeePregnantT1 - tdeeNormal).toBe(0);
  });

  test("TDEE increases by +500 kcal for breastfeeding", () => {
    const tdeeNormal = calculateTDEE(baseBio) ?? 0;
    const tdeeBreastfeeding = calculateTDEE({
      ...baseBio,
      is_breastfeeding: true,
    }) ?? 0;
    expect(tdeeBreastfeeding - tdeeNormal).toBe(500);
  });

  test("Breastfeeding replaces pregnancy uplift (not additive)", () => {
    const tdeePregnantT2 = calculateTDEE({
      ...baseBio,
      is_pregnant: true,
      pregnancy_trimester: 2,
    }) ?? 0;
    const tdeeBreastfeeding = calculateTDEE({
      ...baseBio,
      is_breastfeeding: true,
    }) ?? 0;
    // Breastfeeding should be 500, not 340+500
    expect(tdeeBreastfeeding).toBe(tdeePregnantT2 - 340 + 500);
  });

  test("Macros scale with TDEE for pregnant woman", () => {
    const tdeeNormal = calculateTDEE(baseBio) ?? 0;
    const tdeePregnantT2 = calculateTDEE({
      ...baseBio,
      is_pregnant: true,
      pregnancy_trimester: 2,
    }) ?? 0;

    const macrosNormal = calculateMacros(tdeeNormal, "maintenance", "female");
    const macrosPregnant = calculateMacros(tdeePregnantT2, "maintenance", "female");

    // For maintenance: 25/50/25 split, calories from TDEE
    expect(macrosPregnant.daily_calorie_target).toBe(tdeePregnantT2);
    expect(macrosNormal.daily_calorie_target).toBe(tdeeNormal);

    // Macros should scale proportionally
    const calorieRatio = macrosPregnant.daily_calorie_target / macrosNormal.daily_calorie_target;
    const proteinRatio = macrosPregnant.protein_target_g / macrosNormal.protein_target_g;
    expect(proteinRatio).toBeCloseTo(calorieRatio, 1);
  });
});
