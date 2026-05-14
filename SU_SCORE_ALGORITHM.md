# EarthQuest SUBadge and SUscore Algorithm

## Purpose

The SUBadge represents a player member's personal sustainability profile. The player completes a 36-question form in the app. The app groups those answers into 12 sustainability aspects, calculates a score from 0 to 4 for each aspect, then colors the 12 wedges of the SUBadge from those aspect scores.

## Scale

Each answer uses the same 0 to 4 scale:

| Score | Meaning |
| --- | --- |
| 0 | Not at all / never / highly unsustainable |
| 1 | Rarely / very little / minimal effort |
| 2 | Sometimes / somewhat / moderately sustainable |
| 3 | Often / a lot / strongly sustainable |
| 4 | Consistently / completely / deeply regenerative |

## Categories

The 12 SUBadge wedges follow the handbook order:

1. Food
2. Housing
3. Transportation
4. Energy
5. Land Use and Biodiversity
6. Water Use
7. Ancestors Lifestyle
8. Contaminants and Toxics Use
9. Consumption and Waste
10. Climate Change Actions
11. Health and Wellness
12. Community Sustainability Participation

Each category has three questions.

## Formula

Each category score is the rounded average of its three answers:

```text
categoryScore = round((answer1 + answer2 + answer3) / 3)
```

Example:

```text
Food score = round((food_1 + food_2 + food_3) / 3)
```

The total SUscore is the sum of all 12 category scores:

```text
totalSUscore = sum(categoryScore1 ... categoryScore12)
```

The maximum possible total is:

```text
12 categories * 4 points = 48
```

## Badge Coloring

Each wedge color is based on its category score:

| Category Score | Badge Meaning |
| --- | --- |
| 0 | Empty / unsustainable |
| 1 | Very low sustainability |
| 2 | Moderate sustainability |
| 3 | Strong sustainability |
| 4 | Deep regenerative sustainability |

The badge therefore shows both:

- A total score out of 48.
- A visual pattern showing which sustainability areas are strong or weak.

## Current Implementation

Frontend:

- Questionnaire data and calculation helpers are in `frontend/earthquest-app/utils/suScore.ts`.
- The 12-wedge badge renderer is in `frontend/earthquest-app/components/SUBadge.tsx`.
- The player form is in `frontend/earthquest-app/screens/SUScoreQuestionnaireScreen.tsx`.
- The screen is available from the hamburger menu as `SUBadge Questionnaire`.
- The profile screen displays the saved SUBadge when profile data is loaded.

Backend:

- The user model stores `suScore.answers`, `suScore.categoryScores`, `suScore.totalScore`, and `suScore.completedAt`.
- `PUT /api/profile/su-score` validates all 36 answers, recalculates the scores server-side, and saves the result.
- `GET /api/profile` and `GET /api/profile/full` return the saved `suScore`.

## Why Calculation Happens on Both Sides

The frontend calculates instantly so the player can see the badge update while completing the questionnaire.

The backend recalculates before saving so users cannot submit a fake total score. The backend only trusts the raw answers.

