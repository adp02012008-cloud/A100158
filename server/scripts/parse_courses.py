import json
import re

with open("server/scripts/rawCourses.txt", "r", encoding="utf-8") as f:
    text = f.read()

# Pattern matching each course start:
course_header_pattern = re.compile(
    r"(?:^|\n\n|\n)(?P<header>[^\n]+(?:\n[^\n]+)?)\n+Levels:\s*(?P<levels_count>\d+)\n+(?P<category>[^\n]+)\n+course-img\n",
    re.MULTILINE
)

matches = list(course_header_pattern.finditer(text))

courses = []

for i, match in enumerate(matches):
    header_raw = match.group("header").strip()
    levels_count = int(match.group("levels_count"))
    category = match.group("category").strip()
    
    header_lines = [l.strip() for l in header_raw.split("\n") if l.strip()]
    
    clean_header_lines = []
    for hl in header_lines:
        if hl in ["Register", "Regis", "Completed", "OnGoing", "Manual Grading", "MCQ", "Programming", "GD", "FA", "Training", "GP Challenge", "MCQ + Manual Grading", "No", "No RP", "NO RP", "No RPs", "Assessment Type"]:
            continue
        if re.match(r"^\d+\.\s+", hl):
            continue
        if hl.startswith("With Rewards") or hl.startswith("Attempts:") or hl.startswith("Pre Request"):
            continue
        clean_header_lines.append(hl)

    if not clean_header_lines:
        course_name = f"Course {i + 1}"
        desc = ""
    else:
        course_name = clean_header_lines[0]
        if len(clean_header_lines) > 1 and clean_header_lines[1] != course_name:
            desc = " ".join(clean_header_lines[1:])
        elif len(clean_header_lines) > 2:
            desc = " ".join(clean_header_lines[2:])
        else:
            desc = f"{course_name} comprehensive modular learning path with real-world evaluations and graded milestones."

    # Manual fixes if any:
    if i == 49: # Course 50
        course_name = "GP Challenge"
        desc = "GP Challenge"
    elif course_name.startswith("1. ") or "Gear Measurement" in course_name:
        course_name = "Mechanical Modelling"

    start_body = match.end()
    end_body = matches[i + 1].start() if i + 1 < len(matches) else len(text)
    course_body = text[start_body:end_body].strip()

    level_split_pattern = re.compile(
        r"(?:^|\n)(?P<lvl_num>\d+)\n+(?P<lvl_name>[^\n]+)\n+Attempts:\s*(?P<attempts>\d+)",
        re.MULTILINE
    )
    lvl_matches = list(level_split_pattern.finditer(course_body))
    levels = []

    for li, lm in enumerate(lvl_matches):
        l_num = int(lm.group("lvl_num"))
        l_name = lm.group("lvl_name").strip()
        
        l_start = lm.end()
        l_end = lvl_matches[li + 1].start() if li + 1 < len(lvl_matches) else len(course_body)
        l_body = course_body[l_start:l_end].strip()

        topics = []
        reward_points = 100
        prereq = "None"
        assessment = "MCQ"

        lines = [l.strip() for l in l_body.split("\n") if l.strip()]
        idx = 0
        while idx < len(lines):
            line = lines[idx]
            if re.match(r"^\d+\.\s+", line):
                topics.append(line)
            elif line == "With Rewards":
                if idx + 1 < len(lines):
                    r_line = lines[idx + 1]
                    if "no" in r_line.lower():
                        reward_points = 0
                    else:
                        rm = re.search(r"(\d+)", r_line)
                        if rm:
                            reward_points = int(rm.group(1))
                    idx += 1
            elif line == "Pre Request":
                req_list = []
                idx += 1
                while idx < len(lines) and lines[idx] not in ["Assessment Type", "Register", "Regis", "With Rewards"] and not re.match(r"^\d+$", lines[idx]):
                    if lines[idx].lower() != "no":
                        clean = re.sub(r"^\d+\.\s*", "", lines[idx]).strip()
                        if clean:
                            req_list.append(clean)
                    idx += 1
                if req_list:
                    prereq = ", ".join(req_list)
                continue
            elif line == "Assessment Type":
                if idx + 1 < len(lines):
                    assessment = lines[idx + 1]
                    idx += 1
            idx += 1

        levels.append({
            "levelNumber": l_num,
            "levelName": l_name,
            "rewardPoints": reward_points,
            "prerequisites": prereq,
            "assessmentType": assessment,
            "topics": topics if topics else [f"1. Introduction to {l_name}", "2. Core Application & Concepts", "3. Milestone Assessment"]
        })

    if not levels:
        for ln in range(1, levels_count + 1):
            levels.append({
                "levelNumber": ln,
                "levelName": f"{course_name} Level - {ln}",
                "rewardPoints": 100 * ln,
                "prerequisites": f"Level {ln - 1}" if ln > 1 else "None",
                "assessmentType": "MCQ",
                "topics": [f"1. Introduction to {course_name}", f"2. Practical Evaluation {ln}"]
            })

    # Standardize category
    norm_cat = category.strip()
    if norm_cat.lower() == "general skill":
        norm_cat = "GENERAL Skill"
    elif norm_cat.lower() == "software":
        norm_cat = "Software"
    elif norm_cat.lower() == "hardware":
        norm_cat = "Hardware"
    elif norm_cat.lower() == "beginner":
        norm_cat = "Beginner"
    elif norm_cat.lower() == "advanced":
        norm_cat = "Advanced"

    courses.append({
        "name": course_name,
        "category": norm_cat if norm_cat != "-" else "General",
        "description": desc,
        "clusterAccess": "Both",
        "status": "ACTIVE",
        "levelsCount": len(levels),
        "levels": levels
    })

# Deduplicate courses by name
unique_courses = []
seen = set()
for c in courses:
    k = c["name"].strip().lower()
    if k not in seen and k:
        seen.add(k)
        unique_courses.append(c)

print(f"\nFinal Unique Courses: {len(unique_courses)}")
for i, c in enumerate(unique_courses):
    print(f"{i+1:2d}. {c['name']:<46} | {c['category']:<14} | {len(c['levels'])} levels")

with open("server/scripts/parsedCourses.json", "w", encoding="utf-8") as f:
    json.dump(unique_courses, f, indent=2)

print("\nWrote server/scripts/parsedCourses.json successfully!")
