from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    openai_api_key: str
    openai_model: str = "gpt-4o"
    database_url: str = "mysql+pymysql://root:Lyx2020.@localhost:3306/enterprise_product_design?charset=utf8mb4"
    jwt_secret: str = "enterprise-demo-shared-secret-2026"
    upload_dir: str = "uploads"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
