import json
import os
import re
import sys
import urllib.parse
import urllib.request

LOCATIONS_FILE = "site/locations.json"
PEOPLE_FILE = "site/people.json"


def load_people():
    with open(PEOPLE_FILE, "r") as f:
        return list(json.load(f).keys())


def normalize_date(date_str):
    if not date_str or date_str.lower() == "present":
        return date_str

    date_str = date_str.strip().lower()

    # Already normalized? YYYY-MM-DD or YYYY-MM
    if re.match(r"^\d{4}(-\d{2})?(-\d{2})?$", date_str):
        return date_str

    month_map = {
        "jan": "01",
        "feb": "02",
        "mar": "03",
        "apr": "04",
        "may": "05",
        "jun": "06",
        "jul": "07",
        "aug": "08",
        "sep": "09",
        "oct": "10",
        "nov": "11",
        "dec": "12",
        "january": "01",
        "february": "02",
        "march": "03",
        "april": "04",
        "june": "06",
        "july": "07",
        "august": "08",
        "september": "09",
        "october": "10",
        "november": "11",
        "december": "12",
    }

    # Handle formats like "Feb 2, 2016" or "Feb 05, 2018"
    match = re.search(r"([a-z]+)\s+(\d{1,2}),?\s+(\d{4})", date_str)
    if match:
        m, d, y = match.groups()
        month = month_map.get(m, "01")
        day = d.zfill(2)
        return f"{y}-{month}-{day}"

    # Handle formats like "June 2004" or "Aug 2013"
    match = re.search(r"([a-z]+)\s+(\d{4})", date_str)
    if match:
        m, y = match.groups()
        month = month_map.get(m, "01")
        return f"{y}-{month}"

    # Handle formats like "2004"
    match = re.search(r"^(\d{4})$", date_str)
    if match:
        return match.group(1)

    return date_str


def load_data():
    if os.path.exists(LOCATIONS_FILE):
        with open(LOCATIONS_FILE, "r") as f:
            return json.load(f)
    return []


def save_data(data):
    with open(LOCATIONS_FILE, "w") as f:
        json.dump(data, f, indent=4)


def get_input(prompt, default=None):
    if default:
        val = input(f"{prompt} [{default}]: ").strip()
        return val if val else default
    return input(f"{prompt}: ").strip()


def search_location(query):
    """Search for coordinates using the Photon (OSM) API."""
    encoded_query = urllib.parse.quote(query)
    url = f"https://photon.komoot.io/api/?q={encoded_query}"

    try:
        with urllib.request.urlopen(url) as response:
            data = json.loads(response.read().decode())
            return data.get("features", [])
    except Exception as e:
        print(f"Error searching for location: {e}")
        return []


def select_visitors():
    people = load_people()
    print("\nSelect people (comma-separated numbers, e.g., 1,2,5):")
    for i, person in enumerate(people, 1):
        print(f"{i}. {person}")

    while True:
        try:
            choices = get_input("Visitors")
            indices = [int(x.strip()) - 1 for x in choices.split(",")]
            selected = [
                people[i] for i in indices if 0 <= i < len(people)
            ]
            if selected:
                return selected
            print("Please select at least one person.")
        except (ValueError, IndexError):
            print("Invalid input. Use numbers like 1, 2, 3.")


def add_visit():
    data = load_data()
    data.sort(key=lambda x: x["name"].lower())

    print("\n--- Add New Visit ---")
    print("0. [Add New Location]")
    for i, loc in enumerate(data, 1):
        print(f"{i}. {loc['name']}")

    choice = get_input("Select location", "0")

    location = None
    if choice == "0":
        query = get_input(
            "Search for location (e.g., 'Paris, France' or 'Grand Canyon')"
        )
        results = search_location(query)

        if results:
            print("\nSelect the correct location:")
            for i, res in enumerate(results[:5], 1):
                props = res["properties"]
                # Build context string
                context = [
                    props.get(k) for k in ["city", "state", "country"] if props.get(k)
                ]
                context_str = f" ({', '.join(context)})" if context else ""
                name = (
                    props.get("name")
                    or props.get("street")
                    or props.get("city")
                    or "Unknown Location"
                )
                print(f"{i}. {name}{context_str}")
            print(f"{len(results[:5]) + 1}. [Manual Entry]")

            res_choice = get_input("Choice", "1")
            try:
                idx = int(res_choice) - 1
                if idx < len(results[:5]):
                    res = results[idx]
                    props = res["properties"]
                    coords = res["geometry"]["coordinates"]

                    # Create context string for the name
                    context = [
                        props.get(k) for k in ["city", "country"] if props.get(k)
                    ]
                    display_name = props.get("name") or "Unknown Location"
                    if context:
                        display_name += f", {', '.join(context)}"

                    location = {
                        "name": display_name,
                        "lat": coords[1],
                        "lng": coords[0],
                        "lived": [],
                        "visits": [],
                    }
                    data.append(location)
                else:
                    # Fall back to manual entry
                    raise ValueError
            except (ValueError, IndexError):
                # Manual entry fallback
                name = get_input("Location Name")
                lat = float(get_input("Latitude"))
                lng = float(get_input("Longitude"))
                location = {
                    "name": name,
                    "lat": lat,
                    "lng": lng,
                    "lived": [],
                    "visits": [],
                }
                data.append(location)
        else:
            print("No locations found. Manual entry:")
            name = get_input("Location Name")
            lat = float(get_input("Latitude"))
            lng = float(get_input("Longitude"))
            location = {"name": name, "lat": lat, "lng": lng, "lived": [], "visits": []}
            data.append(location)
    else:
        try:
            location = data[int(choice) - 1]
        except (ValueError, IndexError):
            print("Invalid choice.")
            return

    visitors = select_visitors()

    print("\nType of entry:")
    print("1. Visit (Default)")
    print("2. Lived")
    entry_type = get_input("Choice", "1")

    is_range = get_input("Is this a date range? (y/n)", "n").lower() == "y"

    entry = {"visitors": visitors}
    if is_range:
        start = get_input("Start Date (e.g., '2024-08' or 'Aug 1, 2024')")
        entry["start"] = normalize_date(start)

        end = get_input("End Date (leave blank for 'Present')")
        if end:
            entry["end"] = normalize_date(end)
    else:
        date = get_input("Date (e.g., '2024', '2024-06', '2024-06-15', 'June 2024', 'Jun 15, 2024')")
        entry["date"] = normalize_date(date)

    if entry_type == "2":
        if "lived" not in location:
            location["lived"] = []
        location["lived"].append(entry)
    else:
        if "visits" not in location:
            location["visits"] = []
        location["visits"].append(entry)

    print("\n--- Sanity Check ---")
    print(json.dumps(location, indent=4))
    confirm = get_input("Confirm adding this entry? (y/n)", "y").lower()

    if confirm == "y":
        save_data(data)
        print(f"\nSuccessfully added entry to {location['name']}!")
    else:
        print("\nEntry discarded. Restarting...")
        add_visit()  # Restart the process


if __name__ == "__main__":
    try:
        add_visit()
    except KeyboardInterrupt:
        print("\nCancelled.")
        sys.exit(0)
