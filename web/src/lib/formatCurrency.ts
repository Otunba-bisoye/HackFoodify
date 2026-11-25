export const formatCurrency = (amount: any) => {
  const value = Number(amount) || 0
  
  // Formats 12500 -> ₦12,500
  const formatted = value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  return `₦${formatted}`;
};