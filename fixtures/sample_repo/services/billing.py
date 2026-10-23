"""
Order Billing and Financial Calculations Service.
"""
DEFAULT_TAX_RATE = 0.0825

def calculate_order_total(items: list, tax_rate: float = DEFAULT_TAX_RATE) -> float:
    """Calculates gross total including sales tax."""
    subtotal = sum(float(item.get("price", 0.0)) * int(item.get("quantity", 1)) for item in items)
    tax = subtotal * tax_rate
    return round(subtotal + tax, 2)

class SubscriptionPlanManager:
    """Manages recurring tier allocations and customer discounts."""
    def __init__(self, tier_name: str, monthly_cost: float):
        self.tier_name = tier_name
        self.monthly_cost = monthly_cost

    def calculate_annual_discount(self) -> float:
        """Computes annual payment discount (15%)."""
        return round(self.monthly_cost * 12 * 0.85, 2)
