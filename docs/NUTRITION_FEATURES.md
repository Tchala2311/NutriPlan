# Maternal Nutrition Features (TES-150)

Comprehensive nutrition support for pregnant, breastfeeding, and postpartum users. Integrates evidence-based nutritional guidance into all meal planning and personalization features.

## Feature Overview

### User Lifecycle

Users progress through distinct nutritional phases, each with unique requirements:

| Phase | Duration | Key Need | Database Field |
|-------|----------|----------|-----------------|
| **Pregnancy** | 40 weeks | Fetal development, maternal health | `is_pregnant`, `pregnancy_trimester` |
| **Breastfeeding** | 6-12+ months | Milk production, infant nutrition | `is_breastfeeding` |
| **Postpartum** | 6 months (26 weeks) | Recovery, lactation support | `is_postpartum`, `postpartum_weeks_since_birth` |

### Nutrition Guidance Components

#### 1. Pregnancy Nutrition (`buildPregnancyRestrictions` + SCENARIO_MODIFIERS.pregnancy)

**Safety Restrictions:**
- Exclude: sushi, undercooked meat/eggs, deli meats, unpasteurized cheese, pâté, alcohol
- Limit: high-mercury fish (tuna, swordfish) to 2 servings/week

**Macro Priorities (daily):**
- Folic acid: 600 mcg (chick peas, spinach, avocado, fortified cereals)
- Iron: 27 mg (lean beef, beans, dark greens)
- Calcium: 1000-1300 mg (dairy, leafy greens, fortified alternatives)
- Omega-3 DHA: low-mercury fish (salmon, trout), walnuts, flaxseed
- Protein: sufficient for 1.1 kg gestational weight gain/week

#### 2. Breastfeeding Nutrition (NEW: `buildBreastfeedingGuidance`)

**Calorie & Macro Needs:**
- Calories: +500 kcal/day (milk production = ~150-200 kcal/100mL)
- Protein: 1.3-1.5 g/kg body weight (amino acids for milk synthesis)
- Carbs: adequate for sustained energy
- Fats: DHA for infant brain development

**Critical Micronutrients (pass to infant via milk):**
- Calcium: 1000-1300 mg (maintain maternal bone density)
- Iron: 9-10 mg (maternal recovery from blood loss)
- Omega-3 DHA: 200-300 mg (fetal/infant brain development)
- Vitamin B12: 2.6 mcg (neurological development)
- Zinc: 11-12 mg (immune function)
- Iodine: 290 mcg (thyroid and cognition)

**Galactagogues (Evidence-Based Lactation Boosters):**
- Oats & barley (β-glucan stimulates prolactin)
- Pumpkin & sunflower seeds (zinc content)
- Brewer's yeast (B vitamins + minerals)
- Fenugreek (traditional galactologue)
- Nettle leaf (mineral-dense)
- Dairy products (calcium + lactose)

**Substances Affecting Milk:**
- Caffeine: limit to <300 mg/day (can cause infant irritability)
- Alcohol: wait 2+ hours after consumption
- Spices: some infants sensitive to very spicy foods
- Citrus/tomatoes in excess: potential GI irritation

**Hydration:** Minimum 3-3.5 L/day (critical for supply)

#### 3. Postpartum Recovery (`buildPostpartumGuidance`)

**Recovery Stages:**
- **Early (weeks 1-6):** Frequent small meals, warm foods, high protein
- **Middle (weeks 6-12):** Balanced macros, sustained energy
- **Late (weeks 12-26):** Return to baseline with continued lactation support if nursing

**Nutrition Priorities by Stage:**

**All stages:**
- Iron: 9-10 mg (restore hemoglobin lost in delivery)
- Protein: 1.5-2.0 g/kg (tissue repair, milk synthesis)
- Calcium: 1000-1300 mg (bone restoration)
- Vitamin C: support immune recovery and collagen synthesis
- B vitamins + Magnesium: address depletion from labor

**Cesarean-specific:**
- Protein: 1.8-2.2 g/kg (surgical wound healing)
- Vitamin C + Zinc: connective tissue repair
- Extended recovery timeline (~12 weeks vs. 6 weeks vaginal)

**Meal Frequency:**
- Weeks 1-6: 5-6 small meals/day (easier digestion, sustained recovery)
- Weeks 6+: normalized meal pattern with adequate calories

## Implementation

### Database Schema

```sql
ALTER TABLE health_assessments ADD COLUMN
  is_postpartum BOOLEAN DEFAULT false,
  postpartum_weeks_since_birth INTEGER CHECK (postpartum_weeks_since_birth >= 0 AND postpartum_weeks_since_birth <= 26);
```

### TypeScript Types

```typescript
interface UserProfile {
  is_pregnant?: boolean;
  pregnancy_trimester?: 1 | 2 | 3;
  is_breastfeeding?: boolean;
  is_postpartum?: boolean;
  postpartum_weeks_since_birth?: number | null;
  // ... other fields
}
```

### Prompt Injection

All meal planning and personalization functions inject guidance via:

1. `buildPregnancyRestrictions(user.is_pregnant, user.is_breastfeeding)` — Food safety
2. `buildBreastfeedingGuidance(user.is_breastfeeding)` — Lactation nutrition
3. `buildPostpartumGuidance(user.is_postpartum, user.postpartum_weeks_since_birth)` — Recovery nutrition
4. SCENARIO_MODIFIERS.pregnancy — Pregnancy macro priorities

### Coverage

Functions receiving guidance:
- `generateWeeklyMealPlan()` — Tailored weekly plans
- `generateMealIdeas()` — Food suggestions
- `generateSwapOptions()` — Safe substitutions
- `generateTastePortrait()` — Dietary preferences with restrictions
- `getOnboardingInsight()` — Welcome analysis
- `generateFoodPhoto()` — Food identification with restrictions
- (+ 4 more internal functions)

### API Endpoints

| Endpoint | Fetches Maternal Fields | Passes to GigaChat |
|----------|------------------------|-------------------|
| POST /api/ai/meal-plan | ✅ | ✅ |
| POST /api/meal-redos | ✅ | ✅ |
| POST /api/ai/onboarding | ✅ | ✅ |
| POST /api/taste-portrait/generate | ✅ | ✅ |

### Onboarding Integration

UI captures:
1. Pregnancy status + trimester
2. Breastfeeding status
3. Postpartum status + weeks since birth (0-26, displayed conditionally)

## Testing Scenarios

### Scenario 1: Pregnant User (Trimester 2)
- Expected: High folic acid foods, iron-rich options, low-mercury fish
- Excludes: Sushi, deli meats, unpasteurized cheese

### Scenario 2: Breastfeeding User (3 months postpartum)
- Expected: +500 kcal meals, high protein (1.3-1.5 g/kg)
- Includes: Galactagogues (oats, seeds, dairy)
- Excludes: Extreme spices, high caffeine combinations

### Scenario 3: Early Postpartum (Week 2, Nursing)
- Expected: Frequent small meals, high protein for recovery + lactation
- Includes: Warm foods, easy-to-digest options
- Special focus: Iron, calcium, hydration

## Nutrition Science References

- **Pregnancy:** Institute of Medicine (IOM) Dietary Reference Intakes
- **Breastfeeding:** AAP/ACOG guidelines on lactation nutrition
- **Postpartum:** WHO postpartum recovery guidelines, OB/GYN recovery protocols
- **Galactagogues:** Meta-analysis of evidence-based lactation foods

## Future Enhancements

- [ ] Gestational diabetes meal planning (carb counting, blood sugar management)
- [ ] Pre-eclampsia nutrition (sodium, protein monitoring)
- [ ] Lactation support food bank (meal prep templates)
- [ ] Partner/family meal planning (shared nutrition for household)
- [ ] Postpartum depression nutrition (omega-3, B vitamins, micronutrient tracking)
