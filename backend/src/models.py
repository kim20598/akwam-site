from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class ContentType(str, Enum):
    MOVIE = "movie"
    SERIES = "series"
    SHOW = "show"
    ANIME = "anime"
    DRAMA = "drama"

class Language(str, Enum):
    ARABIC = "arabic"
    TURKISH = "turkish"
    ENGLISH = "english"
    HINDI = "hindi"
    KOREAN = "korean"
    JAPANESE = "japanese"
    MULTI = "multi"

class Quality(str, Enum):
    SD = "SD"
    HD = "HD"
    FHD = "FHD"
    UHD = "UHD"

class MovieBase(BaseModel):
    id: str = Field(..., description="Unique identifier for the movie")
    title: str = Field(..., description="Movie title")
    original_title: Optional[str] = Field(None, description="Original title if different")
    description: Optional[str] = Field(None, description="Movie description/synopsis")
    year: Optional[int] = Field(None, description="Release year")
    duration: Optional[int] = Field(None, description="Duration in minutes")
    rating: Optional[float] = Field(None, ge=0, le=10, description="IMDB or similar rating")
    
    @validator('year')
    def validate_year(cls, v):
        if v and (v < 1900 or v > datetime.now().year + 1):
            raise ValueError('Invalid year')
        return v

class MovieCreate(MovieBase):
    poster_url: Optional[str] = Field(None, description="Poster image URL")
    backdrop_url: Optional[str] = Field(None, description="Backdrop image URL")
    trailer_url: Optional[str] = Field(None, description="Trailer URL")
    genres: List[str] = Field(default_factory=list, description="List of genres")
    directors: List[str] = Field(default_factory=list, description="List of directors")
    cast: List[str] = Field(default_factory=list, description="Main cast")
    country: Optional[str] = Field(None, description="Country of origin")
    language: Optional[Language] = Field(None, description="Primary language")
    quality: Optional[Quality] = Field(None, description="Maximum available quality")
    
    class Config:
        use_enum_values = True

class MovieResponse(MovieCreate):
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    views: int = Field(0, description="View count")
    source_url: str = Field(..., description="Original source URL")
    
    class Config:
        orm_mode = True

class EpisodeBase(BaseModel):
    id: str = Field(..., description="Unique identifier for the episode")
    title: str = Field(..., description="Episode title")
    episode_number: int = Field(..., ge=1, description="Episode number")
    season_number: int = Field(1, ge=1, description="Season number")
    description: Optional[str] = Field(None, description="Episode description")
    duration: Optional[int] = Field(None, description="Duration in minutes")
    
    @validator('title')
    def validate_title(cls, v):
        if not v or v.strip() == "":
            raise ValueError('Title cannot be empty')
        return v.strip()

class EpisodeCreate(EpisodeBase):
    thumbnail_url: Optional[str] = Field(None, description="Episode thumbnail URL")
    air_date: Optional[datetime] = Field(None, description="Original air date")
    
    class Config:
        use_enum_values = True

class EpisodeResponse(EpisodeCreate):
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    source_url: str = Field(..., description="Original source URL")
    
    class Config:
        orm_mode = True

class SeriesBase(BaseModel):
    id: str = Field(..., description="Unique identifier for the series")
    title: str = Field(..., description="Series title")
    original_title: Optional[str] = Field(None, description="Original title if different")
    description: Optional[str] = Field(None, description="Series description")
    year_start: Optional[int] = Field(None, description="Start year")
    year_end: Optional[int] = Field(None, description="End year (if finished)")
    rating: Optional[float] = Field(None, ge=0, le=10, description="IMDB or similar rating")
    total_seasons: Optional[int] = Field(None, ge=1, description="Total number of seasons")
    total_episodes: Optional[int] = Field(None, ge=1, description="Total number of episodes")
    
    @validator('year_end')
    def validate_year_end(cls, v, values):
        if 'year_start' in values and v and values['year_start']:
            if v < values['year_start']:
                raise ValueError('End year cannot be before start year')
        return v

class SeriesCreate(SeriesBase):
    poster_url: Optional[str] = Field(None, description="Series poster URL")
    backdrop_url: Optional[str] = Field(None, description="Series backdrop URL")
    trailer_url: Optional[str] = Field(None, description="Trailer URL")
    genres: List[str] = Field(default_factory=list, description="List of genres")
    directors: List[str] = Field(default_factory=list, description="List of directors")
    cast: List[str] = Field(default_factory=list, description="Main cast")
    country: Optional[str] = Field(None, description="Country of origin")
    language: Optional[Language] = Field(None, description="Primary language")
    status: Optional[str] = Field(None, description="Series status (ongoing, completed, etc.)")
    
    class Config:
        use_enum_values = True

class SeriesResponse(SeriesCreate):
    episodes: List[EpisodeResponse] = Field(default_factory=list, description="List of episodes")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    views: int = Field(0, description="View count")
    source_url: str = Field(..., description="Original source URL")
    
    class Config:
        orm_mode = True

class VideoSource(BaseModel):
    url: str = Field(..., description="Video source URL")
    quality: Quality = Field(Quality.HD, description="Video quality")
    type: str = Field("video/mp4", description="MIME type of the video")
    size: Optional[str] = Field(None, description="File size if known")
    bitrate: Optional[int] = Field(None, description="Video bitrate in kbps")
    width: Optional[int] = Field(None, description="Video width in pixels")
    height: Optional[int] = Field(None, description="Video height in pixels")
    is_direct: bool = Field(True, description="Whether this is a direct video URL")
    requires_proxy: bool = Field(False, description="Whether this URL requires a proxy")
    
    @validator('url')
    def validate_url(cls, v):
        if not v or not v.startswith(('http://', 'https://', '//')):
            raise ValueError('Invalid URL format')
        return v

class Subtitle(BaseModel):
    language: str = Field(..., description="Subtitle language")
    url: str = Field(..., description="Subtitle file URL")
    format: str = Field("srt", description="Subtitle format (srt, vtt, etc.)")
    is_default: bool = Field(False, description="Whether this is the default subtitle")
    
    @validator('language')
    def validate_language(cls, v):
        valid_languages = ['ar', 'en', 'tr', 'fr', 'es', 'de', 'ru', 'fa', 'ur']
        if v not in valid_languages:
            raise ValueError(f'Language must be one of: {", ".join(valid_languages)}')
        return v

class WatchResponse(BaseModel):
    content_id: str = Field(..., description="Content identifier")
    title: str = Field(..., description="Content title")
    type: ContentType = Field(..., description="Content type")
    video_sources: List[VideoSource] = Field(default_factory=list, description="Available video sources")
    subtitles: List[Subtitle] = Field(default_factory=list, description="Available subtitles")
    next_episode: Optional[str] = Field(None, description="Next episode ID if available")
    prev_episode: Optional[str] = Field(None, description="Previous episode ID if available")
    
    class Config:
        use_enum_values = True

class SearchResult(BaseModel):
    id: str = Field(..., description="Content identifier")
    title: str = Field(..., description="Content title")
    type: ContentType = Field(..., description="Content type")
    year: Optional[int] = Field(None, description="Release year")
    poster_url: Optional[str] = Field(None, description="Poster image URL")
    description: Optional[str] = Field(None, description="Brief description")
    score: float = Field(0.0, description="Search relevance score")
    
    class Config:
        use_enum_values = True

class SearchResponse(BaseModel):
    query: str = Field(..., description="Search query")
    results: List[SearchResult] = Field(default_factory=list, description="Search results")
    total_results: int = Field(0, description="Total number of results")
    page: int = Field(1, description="Current page number")
    total_pages: int = Field(1, description="Total number of pages")
    
    class Config:
        use_enum_values = True

class CategoryItem(BaseModel):
    id: str = Field(..., description="Category identifier")
    name: str = Field(..., description="Category name")
    description: Optional[str] = Field(None, description="Category description")
    icon: Optional[str] = Field(None, description="Category icon")
    item_count: int = Field(0, description="Number of items in category")
    
    class Config:
        use_enum_values = True

class HomeSection(BaseModel):
    title: str = Field(..., description="Section title")
    type: str = Field(..., description="Section type (featured, latest, trending, etc.)")
    items: List[MovieResponse] = Field(default_factory=list, description="Items in this section")
    view_all_url: Optional[str] = Field(None, description="URL to view all items")
    
    class Config:
        use_enum_values = True

class HomeResponse(BaseModel):
    sections: List[HomeSection] = Field(default_factory=list, description="Home page sections")
    featured: Optional[MovieResponse] = Field(None, description="Featured content")
    updated_at: datetime = Field(default_factory=datetime.now, description="Last update timestamp")
    
    class Config:
        use_enum_values = True

class APIResponse(BaseModel):
    success: bool = Field(True, description="Whether the request was successful")
    data: Optional[Any] = Field(None, description="Response data")
    message: Optional[str] = Field(None, description="Response message")
    error_code: Optional[str] = Field(None, description="Error code if any")
    timestamp: datetime = Field(default_factory=datetime.now, description="Response timestamp")
    
    class Config:

        use_enum_values = True
