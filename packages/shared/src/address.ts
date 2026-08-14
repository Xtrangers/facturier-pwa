export type Address = {
  line1: string;
  line2?: string;
  postalCode: string;
  city: string;
  country: string;
};

export const emptyAddress = (): Address => ({
  line1: "",
  line2: "",
  postalCode: "",
  city: "",
  country: "FR",
});
