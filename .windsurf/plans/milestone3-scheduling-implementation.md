# Milestone 3: Scheduling System - Implementation Plan

## 🎯 Overview
Implement a comprehensive post scheduling system with calendar interface, time zone support, automated publishing, queue management, and collection-aware scheduling with phase-based content planning.

## 📋 Phase 1: Database Schema & Models

### 1.1 Database Schema
```sql
-- Posts table updates
ALTER TABLE posts ADD COLUMN scheduled_at DATETIME;
ALTER TABLE posts ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC';
ALTER TABLE posts ADD COLUMN status VARCHAR(20) DEFAULT 'draft';
ALTER TABLE posts ADD COLUMN published_at DATETIME;
ALTER TABLE posts ADD COLUMN scheduling_notes TEXT;

-- Create schedules table
CREATE TABLE schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    scheduled_at DATETIME NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, published, failed, cancelled
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id)
);

-- Create schedule_queue table for processing
CREATE TABLE schedule_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id INTEGER NOT NULL,
    priority INTEGER DEFAULT 0, -- Higher number = higher priority
    attempt_at DATETIME NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    locked_until DATETIME, -- For preventing duplicate processing
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (schedule_id) REFERENCES schedules(id)
);

-- Create platform_schedules for multi-platform posting
CREATE TABLE platform_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id INTEGER NOT NULL,
    platform VARCHAR(50) NOT NULL,
    scheduled_at DATETIME NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    platform_post_id VARCHAR(255), -- ID returned by platform API
    response_data JSON,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (schedule_id) REFERENCES schedules(id)
);

-- Create schedule_patterns for recurring posts
CREATE TABLE schedule_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    pattern_type VARCHAR(50) NOT NULL, -- daily, weekly, monthly, custom
    pattern_config JSON NOT NULL, -- {"days": ["monday", "wednesday"], "time": "09:00"}
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create collection_schedules for phase-based planning
CREATE TABLE collection_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    collection_id INTEGER NOT NULL,
    phase_id INTEGER,
    content_frequency INTEGER DEFAULT 1, -- Posts per week
    preferred_times JSON, -- [{"day": "monday", "time": "09:00"}, ...]
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (collection_id) REFERENCES content_type_tags(id),
    FOREIGN KEY (phase_id) REFERENCES content_type_phases(id)
);
```

### 1.2 Models (`backend/app/models/scheduling.py`)
```python
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

class Schedule(Base):
    __tablename__ = "schedules"
    
    id = Column(Integer, primary_key=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    scheduled_at = Column(DateTime, nullable=False)
    timezone = Column(String(50), default="UTC")
    status = Column(String(20), default="scheduled")  # scheduled, published, failed, cancelled
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    error_message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    post = relationship("Post", back_populates="schedule")
    queue_items = relationship("ScheduleQueue", back_populates="schedule")
    platform_schedules = relationship("PlatformSchedule", back_populates="schedule")

class ScheduleQueue(Base):
    __tablename__ = "schedule_queue"
    
    id = Column(Integer, primary_key=True)
    schedule_id = Column(Integer, ForeignKey("schedules.id"), nullable=False)
    priority = Column(Integer, default=0)
    attempt_at = Column(DateTime, nullable=False)
    status = Column(String(20), default="pending")
    locked_until = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    schedule = relationship("Schedule", back_populates="queue_items")

class PlatformSchedule(Base):
    __tablename__ = "platform_schedules"
    
    id = Column(Integer, primary_key=True)
    schedule_id = Column(Integer, ForeignKey("schedules.id"), nullable=False)
    platform = Column(String(50), nullable=False)
    scheduled_at = Column(DateTime, nullable=False)
    status = Column(String(20), default="pending")
    platform_post_id = Column(String(255))
    response_data = Column(JSON)
    error_message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    schedule = relationship("Schedule", back_populates="platform_schedules")

class SchedulePattern(Base):
    __tablename__ = "schedule_patterns"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    pattern_type = Column(String(50), nullable=False)  # daily, weekly, monthly, custom
    pattern_config = Column(JSON, nullable=False)
    timezone = Column(String(50), default="UTC")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def generate_next_occurrences(self, start_date: datetime, count: int = 10):
        """Generate next occurrences based on pattern"""
        pass

class CollectionSchedule(Base):
    __tablename__ = "collection_schedules"
    
    id = Column(Integer, primary_key=True)
    collection_id = Column(Integer, ForeignKey("content_type_tags.id"), nullable=False)
    phase_id = Column(Integer, ForeignKey("content_type_phases.id"))
    content_frequency = Column(Integer, default=1)  # Posts per week
    preferred_times = Column(JSON)
    timezone = Column(String(50), default="UTC")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    collection = relationship("ContentTypeTag")
    phase = relationship("ContentTypePhase")
```

## 📋 Phase 2: Scheduling Service

### 2.1 Core Service (`backend/app/services/scheduling_service.py`)
```python
import asyncio
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from zoneinfo import ZoneInfo
import pytz

class SchedulingService:
    def __init__(self, db: Session):
        self.db = db
        self.default_timezone = "UTC"
    
    def schedule_post(
        self,
        post_id: int,
        scheduled_at: datetime,
        timezone: str = "UTC",
        platforms: List[str] = None
    ) -> Schedule:
        """Schedule a post for publishing"""
        
        # Convert to UTC
        scheduled_utc = self._convert_to_utc(scheduled_at, timezone)
        
        # Create schedule
        schedule = Schedule(
            post_id=post_id,
            scheduled_at=scheduled_utc,
            timezone=timezone
        )
        
        self.db.add(schedule)
        self.db.flush()
        
        # Add to queue
        queue_item = ScheduleQueue(
            schedule_id=schedule.id,
            attempt_at=scheduled_utc,
            priority=self._calculate_priority(scheduled_utc)
        )
        
        self.db.add(queue_item)
        
        # Create platform schedules
        if platforms:
            for platform in platforms:
                platform_schedule = PlatformSchedule(
                    schedule_id=schedule.id,
                    platform=platform,
                    scheduled_at=scheduled_utc
                )
                self.db.add(platform_schedule)
        
        self.db.commit()
        return schedule
    
    def reschedule_post(self, schedule_id: int, new_time: datetime, timezone: str = "UTC"):
        """Reschedule a post to a new time"""
        schedule = self.db.query(Schedule).get(schedule_id)
        if not schedule:
            raise ValueError("Schedule not found")
        
        # Update schedule
        schedule.scheduled_at = self._convert_to_utc(new_time, timezone)
        schedule.timezone = timezone
        schedule.status = "scheduled"
        
        # Update queue
        queue_item = self.db.query(ScheduleQueue).filter_by(
            schedule_id=schedule_id
        ).first()
        
        if queue_item:
            queue_item.attempt_at = schedule.scheduled_at
            queue_item.status = "pending"
            queue_item.locked_until = None
        
        # Update platform schedules
        for platform_schedule in schedule.platform_schedules:
            platform_schedule.scheduled_at = schedule.scheduled_at
            platform_schedule.status = "pending"
        
        self.db.commit()
    
    def cancel_schedule(self, schedule_id: int):
        """Cancel a scheduled post"""
        schedule = self.db.query(Schedule).get(schedule_id)
        if not schedule:
            raise ValueError("Schedule not found")
        
        schedule.status = "cancelled"
        
        # Cancel queue items
        for queue_item in schedule.queue_items:
            queue_item.status = "cancelled"
        
        # Cancel platform schedules
        for platform_schedule in schedule.platform_schedules:
            platform_schedule.status = "cancelled"
        
        self.db.commit()
    
    def get_scheduled_posts(
        self,
        start_date: datetime,
        end_date: datetime,
        timezone: str = "UTC",
        status: Optional[str] = None
    ) -> List[Schedule]:
        """Get scheduled posts within date range"""
        
        # Convert dates to UTC
        start_utc = self._convert_to_utc(start_date, timezone)
        end_utc = self._convert_to_utc(end_date, timezone)
        
        query = self.db.query(Schedule).filter(
            Schedule.scheduled_at.between(start_utc, end_utc)
        )
        
        if status:
            query = query.filter(Schedule.status == status)
        
        return query.order_by(Schedule.scheduled_at).all()
    
    def get_queue_items(self, limit: int = 100) -> List[ScheduleQueue]:
        """Get items ready to be processed from queue"""
        now = datetime.utcnow()
        
        return self.db.query(ScheduleQueue).filter(
            ScheduleQueue.status == "pending",
            ScheduleQueue.attempt_at <= now,
            or_(
                ScheduleQueue.locked_until.is_(None),
                ScheduleQueue.locked_until <= now
            )
        ).order_by(
            ScheduleQueue.priority.desc(),
            ScheduleQueue.attempt_at.asc()
        ).limit(limit).all()
    
    def lock_queue_item(self, queue_item_id: int, lock_duration: int = 300):
        """Lock a queue item to prevent duplicate processing"""
        queue_item = self.db.query(ScheduleQueue).get(queue_item_id)
        if not queue_item:
            return False
        
        queue_item.status = "processing"
        queue_item.locked_until = datetime.utcnow() + timedelta(seconds=lock_duration)
        self.db.commit()
        return True
    
    def _convert_to_utc(self, dt: datetime, timezone: str) -> datetime:
        """Convert datetime from timezone to UTC"""
        if timezone == "UTC":
            return dt
        
        try:
            tz = ZoneInfo(timezone)
            localized = dt.replace(tzinfo=tz)
            return localized.astimezone(ZoneInfo("UTC"))
        except:
            # Fallback to pytz
            tz = pytz.timezone(timezone)
            localized = tz.localize(dt)
            return localized.astimezone(pytz.UTC)
    
    def _calculate_priority(self, scheduled_at: datetime) -> int:
        """Calculate priority based on schedule time"""
        now = datetime.utcnow()
        hours_until = (scheduled_at - now).total_seconds() / 3600
        
        # Higher priority for sooner posts
        if hours_until < 1:
            return 100
        elif hours_until < 24:
            return 50
        else:
            return 10
```

### 2.2 Publisher Service (`backend/app/services/publisher_service.py`)
```python
class PublisherService:
    def __init__(self, db: Session):
        self.db = db
        self.platform_publishers = {
            "instagram": InstagramPublisher(),
            "twitter": TwitterPublisher(),
            "tiktok": TikTokPublisher()
        }
    
    async def publish_scheduled_post(self, schedule_id: int):
        """Publish a scheduled post to all platforms"""
        schedule = self.db.query(Schedule).get(schedule_id)
        if not schedule:
            raise ValueError("Schedule not found")
        
        results = []
        
        for platform_schedule in schedule.platform_schedules:
            if platform_schedule.status == "pending":
                try:
                    publisher = self.platform_publishers.get(platform_schedule.platform)
                    if not publisher:
                        raise ValueError(f"No publisher for {platform_schedule.platform}")
                    
                    # Publish to platform
                    response = await publisher.publish(schedule.post, platform_schedule)
                    
                    # Update platform schedule
                    platform_schedule.status = "published"
                    platform_schedule.platform_post_id = response.get("post_id")
                    platform_schedule.response_data = response
                    
                    results.append({
                        "platform": platform_schedule.platform,
                        "status": "success",
                        "response": response
                    })
                    
                except Exception as e:
                    platform_schedule.status = "failed"
                    platform_schedule.error_message = str(e)
                    
                    results.append({
                        "platform": platform_schedule.platform,
                        "status": "failed",
                        "error": str(e)
                    })
        
        # Update main schedule status
        if all(r["status"] == "success" for r in results):
            schedule.status = "published"
            schedule.published_at = datetime.utcnow()
        elif any(r["status"] == "success" for r in results):
            schedule.status = "partially_published"
        else:
            schedule.status = "failed"
            schedule.retry_count += 1
            if schedule.retry_count < schedule.max_retries:
                # Schedule retry
                retry_time = datetime.utcnow() + timedelta(minutes=5 ** schedule.retry_count)
                self._schedule_retry(schedule.id, retry_time)
        
        self.db.commit()
        return results
```

## 📋 Phase 3: Calendar Interface

### 3.1 Backend API (`backend/app/api/scheduling.py`)
```python
@router.get("/schedule/calendar")
async def get_calendar_view(
    year: int,
    month: int,
    timezone: str = "UTC",
    db: Session = Depends(get_db)
):
    """Get calendar view for specified month"""
    
    # Get date range
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1) - timedelta(days=1)
    else:
        end_date = datetime(year, month + 1, 1) - timedelta(days=1)
    
    # Get schedules
    schedules = scheduling_service.get_scheduled_posts(
        start_date,
        end_date,
        timezone
    )
    
    # Format for calendar
    calendar_data = {}
    for schedule in schedules:
        date_key = schedule.scheduled_at.strftime("%Y-%m-%d")
        if date_key not in calendar_data:
            calendar_data[date_key] = []
        
        calendar_data[date_key].append({
            "id": schedule.id,
            "post_id": schedule.post_id,
            "title": schedule.post.title,
            "time": schedule.scheduled_at.strftime("%H:%M"),
            "status": schedule.status,
            "platforms": [ps.platform for ps in schedule.platform_schedules]
        })
    
    return {
        "year": year,
        "month": month,
        "data": calendar_data,
        "timezone": timezone
    }

@router.post("/schedule")
async def schedule_post(
    post_id: int,
    scheduled_at: str,
    timezone: str = "UTC",
    platforms: List[str] = None,
    db: Session = Depends(get_db)
):
    """Schedule a post"""
    
    # Parse datetime
    scheduled_dt = datetime.fromisoformat(scheduled_at)
    
    schedule = scheduling_service.schedule_post(
        post_id=post_id,
        scheduled_at=scheduled_dt,
        timezone=timezone,
        platforms=platforms
    )
    
    return {"schedule_id": schedule.id, "status": "scheduled"}

@router.put("/schedule/{schedule_id}/reschedule")
async def reschedule_post(
    schedule_id: int,
    new_time: str,
    timezone: str = "UTC",
    db: Session = Depends(get_db)
):
    """Reschedule a post"""
    
    new_dt = datetime.fromisoformat(new_time)
    scheduling_service.reschedule_post(schedule_id, new_dt, timezone)
    
    return {"status": "rescheduled"}

@router.delete("/schedule/{schedule_id}")
async def cancel_schedule(schedule_id: int, db: Session = Depends(get_db)):
    """Cancel a scheduled post"""
    
    scheduling_service.cancel_schedule(schedule_id)
    
    return {"status": "cancelled"}

@router.get("/schedule/queue")
async def get_schedule_queue(db: Session = Depends(get_db)):
    """Get current publishing queue"""
    
    queue_items = scheduling_service.get_queue_items(limit=50)
    
    return {
        "items": [
            {
                "id": item.id,
                "schedule_id": item.schedule_id,
                "attempt_at": item.attempt_at.isoformat(),
                "priority": item.priority,
                "status": item.status
            }
            for item in queue_items
        ]
    }
```

### 3.2 Frontend Calendar Component (`frontend/src/components/SchedulingCalendar.tsx`)
```typescript
interface CalendarDay {
    date: Date;
    isCurrentMonth: boolean;
    schedules: ScheduleItem[];
}

interface ScheduleItem {
    id: number;
    post_id: number;
    title: string;
    time: string;
    status: 'scheduled' | 'published' | 'failed' | 'cancelled';
    platforms: string[];
}

const SchedulingCalendar: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [calendarData, setCalendarData] = useState<Record<string, ScheduleItem[]>>({});
    const [timezone, setTimezone] = useState('UTC');
    
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    
    // Fetch calendar data
    useEffect(() => {
        fetchCalendarData();
    }, [year, month, timezone]);
    
    const fetchCalendarData = async () => {
        const response = await api.get(`/schedule/calendar?year=${year}&month=${month + 1}&timezone=${timezone}`);
        setCalendarData(response.data.data);
    };
    
    // Generate calendar days
    const generateCalendarDays = (): CalendarDay[] => {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        const days: CalendarDay[] = [];
        const current = new Date(startDate);
        
        for (let i = 0; i < 42; i++) {
            const dateKey = current.toISOString().split('T')[0];
            days.push({
                date: new Date(current),
                isCurrentMonth: current.getMonth() === month,
                schedules: calendarData[dateKey] || []
            });
            current.setDate(current.getDate() + 1);
        }
        
        return days;
    };
    
    const handleDayClick = (day: CalendarDay) => {
        setSelectedDate(day.date);
    };
    
    const handleSchedulePost = (post: Post, time: string) => {
        // Open scheduling modal
        openScheduleModal({
            post,
            date: selectedDate,
            time,
            timezone
        });
    };
    
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setCurrentDate(new Date(year, month - 1))}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-xl font-semibold">
                        {format(currentDate, 'MMMM yyyy')}
                    </h2>
                    <button
                        onClick={() => setCurrentDate(new Date(year, month + 1))}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
                
                <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="px-3 py-2 border rounded-lg"
                >
                    {timezones.map(tz => (
                        <option key={tz} value={tz}>{tz}</option>
                    ))}
                </select>
            </div>
            
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700">
                {/* Day headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="bg-gray-50 dark:bg-gray-900 p-2 text-center text-sm font-medium">
                        {day}
                    </div>
                ))}
                
                {/* Calendar days */}
                {generateCalendarDays().map((day, index) => (
                    <div
                        key={index}
                        onClick={() => handleDayClick(day)}
                        className={`
                            bg-white dark:bg-gray-800 p-2 min-h-[100px] cursor-pointer
                            hover:bg-gray-50 dark:hover:bg-gray-700
                            ${!day.isCurrentMonth ? 'opacity-50' : ''}
                            ${isToday(day.date) ? 'ring-2 ring-blue-500' : ''}
                        `}
                    >
                        <div className="text-sm font-medium mb-1">
                            {format(day.date, 'd')}
                        </div>
                        
                        {/* Schedule items */}
                        <div className="space-y-1">
                            {day.schedules.slice(0, 3).map(schedule => (
                                <div
                                    key={schedule.id}
                                    className={`
                                        text-xs p-1 rounded cursor-pointer
                                        ${getStatusColor(schedule.status)}
                                    `}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // Open schedule details
                                    }}
                                >
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        <span>{schedule.time}</span>
                                    </div>
                                    <div className="truncate">{schedule.title}</div>
                                    {schedule.platforms.length > 0 && (
                                        <div className="flex gap-1">
                                            {schedule.platforms.map(platform => (
                                                <span key={platform} className="text-xs">
                                                    {getPlatformIcon(platform)}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {day.schedules.length > 3 && (
                                <div className="text-xs text-gray-500">
                                    +{day.schedules.length - 3} more
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Schedule Details Sidebar */}
            {selectedDate && (
                <ScheduleDetailsSidebar
                    date={selectedDate}
                    schedules={calendarData[selectedDate.toISOString().split('T')[0]] || []}
                    onClose={() => setSelectedDate(null)}
                    onSchedulePost={handleSchedulePost}
                />
            )}
        </div>
    );
};
```

## 📋 Phase 4: Queue Management & Worker

### 4.1 Background Worker (`backend/app/workers/scheduler_worker.py`)
```python
import asyncio
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from ..services.scheduling_service import SchedulingService
from ..services.publisher_service import PublisherService

logger = logging.getLogger(__name__)

class SchedulerWorker:
    def __init__(self, db: Session):
        self.db = db
        self.scheduling_service = SchedulingService(db)
        self.publisher_service = PublisherService(db)
        self.running = False
    
    async def start(self):
        """Start the scheduler worker"""
        self.running = True
        logger.info("Scheduler worker started")
        
        while self.running:
            try:
                # Get items from queue
                queue_items = self.scheduling_service.get_queue_items(limit=10)
                
                if not queue_items:
                    # No items, wait before checking again
                    await asyncio.sleep(10)
                    continue
                
                # Process items concurrently
                tasks = []
                for item in queue_items:
                    # Lock the item
                    if self.scheduling_service.lock_queue_item(item.id):
                        task = asyncio.create_task(self.process_queue_item(item))
                        tasks.append(task)
                
                if tasks:
                    await asyncio.gather(*tasks, return_exceptions=True)
                
            except Exception as e:
                logger.error(f"Error in scheduler worker: {e}")
                await asyncio.sleep(5)
    
    async def process_queue_item(self, queue_item: ScheduleQueue):
        """Process a single queue item"""
        try:
            logger.info(f"Processing schedule {queue_item.schedule_id}")
            
            # Publish the post
            results = await self.publisher_service.publish_scheduled_post(
                queue_item.schedule_id
            )
            
            # Log results
            for result in results:
                if result["status"] == "success":
                    logger.info(f"Published to {result['platform']}")
                else:
                    logger.error(f"Failed to publish to {result['platform']}: {result['error']}")
            
        except Exception as e:
            logger.error(f"Error processing queue item {queue_item.id}: {e}")
            
            # Update schedule with error
            schedule = self.db.query(Schedule).get(queue_item.schedule_id)
            if schedule:
                schedule.status = "failed"
                schedule.error_message = str(e)
                self.db.commit()
    
    def stop(self):
        """Stop the scheduler worker"""
        self.running = False
        logger.info("Scheduler worker stopped")

# Global worker instance
scheduler_worker = None

async def start_scheduler_worker():
    """Start the global scheduler worker"""
    global scheduler_worker
    db = next(get_db())
    scheduler_worker = SchedulerWorker(db)
    await scheduler_worker.start()

def stop_scheduler_worker():
    """Stop the global scheduler worker"""
    global scheduler_worker
    if scheduler_worker:
        scheduler_worker.stop()
```

## 📋 Phase 5: Collection-Aware Scheduling

### 5.1 Collection Schedule Service
```python
class CollectionScheduleService:
    def generate_collection_schedule(
        self,
        collection_id: int,
        phase_id: Optional[int] = None,
        content_frequency: int = 1,
        preferred_times: List[Dict] = None,
        duration_weeks: int = 4
    ):
        """Generate schedule for collection content"""
        
        # Get unposted media for collection/phase
        media_query = self.db.query(MediaVault)\
            .join(MediaVault.content_type_tags)\
            .filter(MediaVault.content_type_tags.any(id=collection_id))
        
        if phase_id:
            media_query = media_query.filter(
                MediaVault.versions.any(
                    MediaVersion.enhancement_tags.any(name=f"phase_{phase_id}")
                )
            )
        
        available_media = media_query.filter(MediaVault.is_usable == True).all()
        
        # Generate schedule based on frequency
        schedules = []
        current_date = datetime.now()
        
        for week in range(duration_weeks):
            for day in range(7):
                # Check if this day has preferred times
                day_name = current_date.strftime("%A").lower()
                day_times = [
                    t for t in (preferred_times or [])
                    if t.get("day", "").lower() == day_name
                ]
                
                if day_times and available_media:
                    # Schedule media for each preferred time
                    for time_config in day_times:
                        if available_media:
                            media = available_media.pop(0)
                            
                            scheduled_at = datetime.strptime(
                                f"{current_date.strftime('%Y-%m-%d')} {time_config['time']}",
                                "%Y-%m-%d %H:%M"
                            )
                            
                            schedule = self.scheduling_service.schedule_post(
                                post_id=media.post_id,
                                scheduled_at=scheduled_at,
                                platforms=["instagram", "twitter"]
                            )
                            
                            schedules.append(schedule)
                
                current_date += timedelta(days=1)
        
        return schedules
```

## 🎯 Implementation Timeline

### Week 1: Database & Core Services
- Day 1-2: Database schema and models
- Day 3-4: Scheduling and publisher services
- Day 5: Basic API endpoints

### Week 2: Calendar Interface
- Day 1-2: Calendar component
- Day 3-4: Schedule management UI
- Day 5: Timezone support

### Week 3: Queue & Worker
- Day 1-2: Queue management system
- Day 3-4: Background worker
- Day 5: Error handling and retries

### Week 4: Collection Scheduling
- Day 1-2: Collection schedule service
- Day 3-4: Phase-based planning
- Day 5: Testing and optimization

## 📊 Success Metrics

- Posts can be scheduled with specific date/time
- Calendar view shows all scheduled content
- Automatic publishing works reliably
- Time zones handled correctly
- Collection-based scheduling creates balanced content flow
- Failed publishes are retried appropriately

## 🔄 Testing Strategy

1. Unit tests for all services
2. Integration tests for API endpoints
3. End-to-end tests for scheduling flow
4. Load testing for queue processing
5. Timezone testing across different regions
