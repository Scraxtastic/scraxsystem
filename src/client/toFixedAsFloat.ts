export const toFixedAsFloat = (value: number, fixed: number) => {
    if (value === null) {
      return null;
    }
    return parseFloat(value.toFixed(fixed));
  };