"""
Output validation for design generation results.
Validates GPT-4o output against Pydantic schema and fixes common issues.
"""
from pydantic import BaseModel, field_validator, model_validator
from typing import Literal


class ComplianceRisk(BaseModel):
    term: str
    riskType: str = "未分类"
    severity: Literal["high", "medium", "low"] = "low"
    suggestion: str


class ComplianceReport(BaseModel):
    riskLevel: Literal["low", "medium", "high"] = "low"
    risks: list[ComplianceRisk] = []

    @model_validator(mode="after")
    def sync_risk_level(self) -> "ComplianceReport":
        if self.risks:
            severities = [r.severity for r in self.risks]
            if "high" in severities:
                self.riskLevel = "high"
            elif "medium" in severities:
                self.riskLevel = "medium"
        return self


class DesignCard(BaseModel):
    type: str
    title: str = ""
    description: str = ""
    tagline: str = ""
    subtagline: str = ""
    promptZh: str
    promptEn: str
    negativePrompt: str = (
        "blurry, low quality, watermark, text errors, deformed product, "
        "inconsistent packaging, duplicate items, messy background, overexposed"
    )

    @field_validator("promptZh", "promptEn")
    @classmethod
    def prompt_not_empty(cls, v: str) -> str:
        if not v or len(v.strip()) < 20:
            raise ValueError("Prompt too short — minimum 20 characters")
        return v.strip()


class StrategyBlock(BaseModel):
    positioning: str = ""
    targetUser: str = ""
    sellingPoints: list[str] = []
    composition: str = ""
    detailModules: list[str] = []
    socialAngle: str = ""
    background: str = ""
    dimensions: str = ""
    complianceNotes: str = ""

    @field_validator("sellingPoints")
    @classmethod
    def ensure_three_points(cls, v: list[str]) -> list[str]:
        while len(v) < 3:
            v.append("品质保证")
        return v[:3]

    @field_validator("detailModules")
    @classmethod
    def ensure_three_modules(cls, v: list[str]) -> list[str]:
        defaults = ["产品特性展示", "使用场景展示", "品牌故事"]
        while len(v) < 3:
            v.append(defaults[len(v)])
        return v[:3]


class DesignResult(BaseModel):
    strategy: StrategyBlock
    designs: list[DesignCard]
    compliance: ComplianceReport = ComplianceReport()
    platform: str = ""
    style: str = ""
    platformDims: dict = {}
    hasVisionAnalysis: bool = False

    @field_validator("designs")
    @classmethod
    def at_least_one_design(cls, v: list[DesignCard]) -> list[DesignCard]:
        if not v:
            raise ValueError("designs list must not be empty")
        return v


def validate_and_fix(raw: dict) -> dict:
    """Validate raw GPT-4o output and fix common issues. Returns clean dict."""
    result = DesignResult.model_validate(raw)
    return result.model_dump()
