"""
Physical Parameters & Simulation Configuration for the Cart-Mounted Inverted Pendulum System.
All values are in standard SI units (angles internally in radians).
"""

from dataclasses import dataclass
from typing import Dict, Any, List, Tuple


@dataclass
class SystemParameters:
    # Mass of the cart (kg)
    M: float = 0.5
    # Mass of the pendulum bob/rod (kg)
    m: float = 0.2
    # Distance from pivot to pendulum center-of-mass (m)
    l: float = 0.3
    # Moment of inertia of pendulum about its center-of-mass (kg*m^2)
    I: float = 0.006
    # Cart linear viscous friction coefficient (N*s/m)
    b: float = 0.1
    # Acceleration due to gravity (m/s^2)
    g: float = 9.81

    def validate(self) -> Tuple[bool, List[str]]:
        errors: List[str] = []
        if self.M <= 0:
            errors.append("Cart mass M must be strictly positive (M > 0 kg).")
        if self.m <= 0:
            errors.append("Pendulum mass m must be strictly positive (m > 0 kg).")
        if self.l <= 0:
            errors.append("Pendulum COM distance l must be strictly positive (l > 0 m).")
        if self.I <= 0:
            errors.append("Moment of inertia I must be strictly positive (I > 0 kg·m²).")
        if self.b < 0:
            errors.append("Cart viscous friction b cannot be negative (b >= 0 N·s/m).")
        if self.g <= 0:
            errors.append("Gravitational acceleration g must be strictly positive (g > 0 m/s²).")
        p = self.I * (self.M + self.m) + self.M * self.m * (self.l ** 2)
        if p <= 1e-12:
            errors.append("Inertia-mass denominator p = I(M+m) + Mml² must be positive.")
        return len(errors) == 0, errors

    def to_dict(self) -> Dict[str, Any]:
        return {
            "M": {
                "value": self.M,
                "unit": "kg",
                "name": "Cart Mass",
                "description": "Mass of the translating cart on the horizontal track"
            },
            "m": {
                "value": self.m,
                "unit": "kg",
                "name": "Pendulum Mass",
                "description": "Total mass of the inverted pendulum assembly"
            },
            "l": {
                "value": self.l,
                "unit": "m",
                "name": "Center-of-Mass Distance",
                "description": "Distance from the cart pivot axis to the pendulum center-of-mass"
            },
            "I": {
                "value": self.I,
                "unit": "kg·m²",
                "name": "Pendulum Moment of Inertia",
                "description": "Mass moment of inertia of the pendulum about its own center-of-mass"
            },
            "b": {
                "value": self.b,
                "unit": "N·s/m",
                "name": "Cart Viscous Friction",
                "description": "Linear friction coefficient opposing the horizontal cart motion"
            },
            "g": {
                "value": self.g,
                "unit": "m/s²",
                "name": "Gravitational Acceleration",
                "description": "Local acceleration of gravity acting downward"
            }
        }

    def to_raw_dict(self) -> Dict[str, float]:
        return {
            "M": float(self.M),
            "m": float(self.m),
            "l": float(self.l),
            "I": float(self.I),
            "b": float(self.b),
            "g": float(self.g),
        }


@dataclass
class SimulationConfig:
    x0: float = 0.0
    x_dot0: float = 0.0
    theta0: float = 0.08726646259971647  # 5 deg in rad
    theta_dot0: float = 0.0
    dt: float = 0.01
    duration: float = 8.0
    model_type: str = "nonlinear"        # "nonlinear" | "linear"
    control_mode: str = "auto"           # "auto" | "manual" | "auto_with_disturbance"
    saturation_enabled: bool = False
    u_min: float = -10.0
    u_max: float = 10.0

    def validate(self) -> Tuple[bool, List[str]]:
        errors: List[str] = []
        if self.dt <= 0 or self.dt > 0.2:
            errors.append("Simulation time step dt must be in (0, 0.2] seconds.")
        if self.duration <= 0 or self.duration > 120.0:
            errors.append("Simulation duration must be in (0, 120] seconds.")
        if self.model_type not in ("nonlinear", "linear"):
            errors.append("model_type must be 'nonlinear' or 'linear'.")
        if self.control_mode not in ("auto", "manual", "auto_with_disturbance"):
            errors.append("control_mode must be 'auto', 'manual', or 'auto_with_disturbance'.")
        if self.saturation_enabled and self.u_min >= self.u_max:
            errors.append("Actuator minimum force u_min must be strictly less than u_max.")
        return len(errors) == 0, errors


def get_default_parameters() -> SystemParameters:
    """Returns a new instance of standard parameters."""
    return SystemParameters()
