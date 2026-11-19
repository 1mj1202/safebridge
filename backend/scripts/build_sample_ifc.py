"""샘플 IFC 다시 만들기: python -m scripts.build_sample_ifc"""
from app.core.config import get_settings
from engine.sample_ifc import write

if __name__ == "__main__":
    print(write(get_settings().ifc_path))
