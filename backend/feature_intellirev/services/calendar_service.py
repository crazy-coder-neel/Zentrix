import datetime
import logging
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

logger = logging.getLogger(__name__)

def sync_study_plan(access_token, schedule, daily_slots):
    """
    Syncs a 5-day study plan to Google Calendar.
    - Uses custom daily slots for each day.
    - Includes a 10-minute popup reminder.
    """
    try:
        creds = Credentials(token=access_token)
        service = build('calendar', 'v3', credentials=creds)

        today = datetime.date.today()
        results = []

        # Iterate through the schedule dictionary ("Day 1", "Day 2", etc.)
        for day_label, topics in schedule.items():
            try:
                # Extract day number (e.g., Day 1 -> 0, Day 2 -> 1, ...)
                day_num = int(day_label.split()[-1])
                event_date = today + datetime.timedelta(days=day_num - 1)
                
                # Get the slots for this day from our map
                slots = daily_slots.get(str(day_num), [{"start": "09:00", "end": "11:00"}])

                for i, slot in enumerate(slots):
                    start_time = slot.get("start", "09:00")
                    end_time = slot.get("end", "11:00")
                    
                    # Removing 'Z' and 'timeZone: UTC' forces Google to use the user's local calendar timezone
                    start_dt = f"{event_date}T{start_time}:00" 
                    end_dt = f"{event_date}T{end_time}:00"

                    summary = f"📑 Study Day {day_num}: {', '.join(topics[:2])}" 
                    if len(topics) > 2: summary += "..."

                    event = {
                        'summary': summary,
                        'location': 'Zentrix-IntelliRev Dashboard',
                        'description': f'Focus on: {", ".join(topics)}',
                        'start': {
                            'dateTime': start_dt,
                        },
                        'end': {
                            'dateTime': end_dt,
                        },
                        'reminders': {
                            'useDefault': False,
                            'overrides': [
                                {'method': 'popup', 'minutes': 10},
                            ],
                        },
                    }

                    created_event = service.events().insert(calendarId='primary', body=event).execute()
                    results.append({
                        "day": day_label,
                        "slot": i + 1,
                        "htmlLink": created_event.get('htmlLink')
                    })
                
                logger.info(f"Created Calendar events for {day_label}")
            except Exception as e:
                logger.error(f"Failed to create events for {day_label}: {e}")
                continue

        return results
    except Exception as e:
        logger.error(f"Google Calendar Service Error: {e}")
        return []
