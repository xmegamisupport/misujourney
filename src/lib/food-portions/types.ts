export type FoodCategory =
  | "rice"
  | "noodle"
  | "congee"
  | "bread"
  | "chicken"
  | "beef"
  | "fish"
  | "egg"
  | "vegetable"
  | "broccoli"
  | "fruit"
  | "milk"
  | "drink"
  | "fried"
  | "dessert";

export interface FoodPortionOption {
  id: string;
  category: FoodCategory;
  displayName: string;
  emoji: string;
  portionLabel: string;
  portionValue: number;
  isBaseUnit: boolean;
  gram: number;
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
  fiber: number;
}

/** The portion the customer actually picked for one food item — never
 * shows `gram` in the UI, but it's carried through so the DB always has it. */
export interface SelectedPortion {
  category: FoodCategory;
  portionLabel: string;
  gram: number;
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
  fiber: number;
  isCustom: boolean;
}
