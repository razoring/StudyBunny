from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db_name: str = "study_room"
    gemini_api_key: str = ""
    chroma_persist_dir: str = "./chroma_data"
    cors_origins: str = "http://localhost:3000"
    eleven_labs: str = ""
    presage: str = ""
    auth0: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

