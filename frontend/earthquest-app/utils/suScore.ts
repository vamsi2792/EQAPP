export type SUScoreValue = 0 | 1 | 2 | 3 | 4;

export type SUQuestion = {
  id: string;
  text: string;
};

export type SUCategory = {
  id: string;
  label: string;
  shortLabel: string;
  questions: SUQuestion[];
};

export type SUAnswers = Record<string, SUScoreValue>;
export type SUCategoryScores = Record<string, SUScoreValue>;

export const SU_SCALE_LABELS = [
  "Not at all / never",
  "Rarely / very little",
  "Sometimes / somewhat",
  "Often / most of the time",
  "Consistently / deeply regenerative",
];

export const SU_CATEGORIES: SUCategory[] = [
  {
    id: "food",
    label: "Food",
    shortLabel: "Food",
    questions: [
      {
        id: "food_1",
        text: "How often do you consume in-season, organic plant-based food that is locally produced within about 100 miles?",
      },
      {
        id: "food_2",
        text: "How much do you grow or produce your own organic food?",
      },
      {
        id: "food_3",
        text: "How much do you minimize consumption of highly processed or packaged foods?",
      },
    ],
  },
  {
    id: "housing",
    label: "Housing",
    shortLabel: "Housing",
    questions: [
      {
        id: "housing_1",
        text: "How much does your home integrate sustainability features such as renewable materials, greywater, composting, repair space, food storage, or a green roof?",
      },
      {
        id: "housing_2",
        text: "How much living space do you use relative to your needs, avoiding excess rooms and space?",
      },
      {
        id: "housing_3",
        text: "How much do your home furnishings use renewable, natural, low-toxicity materials and finishes?",
      },
    ],
  },
  {
    id: "transportation",
    label: "Transportation",
    shortLabel: "Transport",
    questions: [
      {
        id: "transportation_1",
        text: "How often do you use walking, biking, public transit, carpooling, electric transportation, or low-carbon alternatives to flying?",
      },
      {
        id: "transportation_2",
        text: "How fuel-efficient or low-emission is your primary vehicle?",
      },
      {
        id: "transportation_3",
        text: "How often do you combine trips, work remotely, or avoid unnecessary travel?",
      },
    ],
  },
  {
    id: "energy",
    label: "Energy",
    shortLabel: "Energy",
    questions: [
      {
        id: "energy_1",
        text: "What percentage of the energy used for your home, business, and lifestyle comes from renewable sources?",
      },
      {
        id: "energy_2",
        text: "How consistently do you monitor, reduce, or eliminate unnecessary energy use?",
      },
      {
        id: "energy_3",
        text: "How low-energy and energy-efficient are your home and appliances?",
      },
    ],
  },
  {
    id: "landUseBiodiversity",
    label: "Land Use and Biodiversity",
    shortLabel: "Land",
    questions: [
      {
        id: "landUseBiodiversity_1",
        text: "How much of the yard or land around your home supports native trees, plants, and wildlife habitat?",
      },
      {
        id: "landUseBiodiversity_2",
        text: "How much does your land support sustainable, low-impact living such as food production or permeable surfaces?",
      },
      {
        id: "landUseBiodiversity_3",
        text: "How actively do you restore, enhance, and protect ecological biodiversity around your home?",
      },
    ],
  },
  {
    id: "waterUse",
    label: "Water Use",
    shortLabel: "Water",
    questions: [
      {
        id: "waterUse_1",
        text: "How often do you efficiently use and conserve water in daily activities?",
      },
      {
        id: "waterUse_2",
        text: "How much do you capture, retain, or reuse water through rain barrels, rain gardens, ponds, septic gardens, or greywater?",
      },
      {
        id: "waterUse_3",
        text: "How often do you prevent water pollution through proper runoff, septic, and chemical practices?",
      },
    ],
  },
  {
    id: "ancestorsLifestyle",
    label: "Ancestors Lifestyle",
    shortLabel: "Ancestors",
    questions: [
      {
        id: "ancestorsLifestyle_1",
        text: "To what extent did parents or grandparents demonstrate sustainable living practices to younger generations?",
      },
      {
        id: "ancestorsLifestyle_2",
        text: "To what degree did parents or grandparents teach sustainability values, ethics, and practical skills?",
      },
      {
        id: "ancestorsLifestyle_3",
        text: "How actively did parents or grandparents involve younger family members in making the household more sustainable?",
      },
    ],
  },
  {
    id: "contaminantsToxics",
    label: "Contaminants and Toxics Use",
    shortLabel: "Toxics",
    questions: [
      {
        id: "contaminantsToxics_1",
        text: "How often do you make yourself aware of and avoid toxic household and personal care products?",
      },
      {
        id: "contaminantsToxics_2",
        text: "How often do you choose non-toxic, eco-friendly, and sustainable alternatives when necessary?",
      },
      {
        id: "contaminantsToxics_3",
        text: "How safely do you dispose of contaminants and hazardous materials so they are kept out of landfills?",
      },
    ],
  },
  {
    id: "consumptionWaste",
    label: "Consumption and Waste",
    shortLabel: "Waste",
    questions: [
      {
        id: "consumptionWaste_1",
        text: "How much do you limit overall purchase and consumption of non-essential goods?",
      },
      {
        id: "consumptionWaste_2",
        text: "How effectively do you reuse products and containers, recycle materials, and compost organic waste?",
      },
      {
        id: "consumptionWaste_3",
        text: "How often do you repair items instead of replacing them?",
      },
    ],
  },
  {
    id: "climateActions",
    label: "Climate Change Actions",
    shortLabel: "Climate",
    questions: [
      {
        id: "climateActions_1",
        text: "How actively do you reduce your greenhouse gas emissions and fossil fuel use?",
      },
      {
        id: "climateActions_2",
        text: "How actively do you work with neighbors and community to install nature-based climate resilience measures?",
      },
      {
        id: "climateActions_3",
        text: "How actively do you support local policies or initiatives for emissions reduction, renewable energy, climate science, and adaptation?",
      },
    ],
  },
  {
    id: "healthWellness",
    label: "Health and Wellness",
    shortLabel: "Health",
    questions: [
      {
        id: "healthWellness_1",
        text: "How much does your lifestyle support physical health and fitness?",
      },
      {
        id: "healthWellness_2",
        text: "How much does your lifestyle support mental health and emotional well-being?",
      },
      {
        id: "healthWellness_3",
        text: "How often do you engage with nature and participate in outdoor recreation in a healthy natural environment?",
      },
    ],
  },
  {
    id: "communityParticipation",
    label: "Community Sustainability Participation",
    shortLabel: "Community",
    questions: [
      {
        id: "communityParticipation_1",
        text: "How often do you share sustainability knowledge and skills or encourage others to live sustainably?",
      },
      {
        id: "communityParticipation_2",
        text: "How involved are you in local environmental or sustainability organizations or government committees?",
      },
      {
        id: "communityParticipation_3",
        text: "How actively do you collaborate with others to plan and implement community sustainability projects?",
      },
    ],
  },
];

export const createDefaultAnswers = (): SUAnswers =>
  SU_CATEGORIES.reduce<SUAnswers>((answers, category) => {
    category.questions.forEach((question) => {
      answers[question.id] = 0;
    });
    return answers;
  }, {});

export const calculateSUCategoryScores = (
  answers: SUAnswers,
): SUCategoryScores =>
  SU_CATEGORIES.reduce<SUCategoryScores>((scores, category) => {
    const total = category.questions.reduce(
      (sum, question) => sum + (answers[question.id] ?? 0),
      0,
    );

    scores[category.id] = Math.round(
      total / category.questions.length,
    ) as SUScoreValue;

    return scores;
  }, {});

export const calculateSUTotal = (categoryScores: SUCategoryScores) =>
  SU_CATEGORIES.reduce(
    (total, category) => total + (categoryScores[category.id] ?? 0),
    0,
  );

