import json
import re
from urllib.parse import urljoin

def extract_game_info(raw_obj):
    try:
        vm = raw_obj['richItemRenderer']['content']['miniGameCardViewModel']
        info_popup = next(
            item for item in vm['overflowButton']['buttonViewModel']['onTap']['innertubeCommand']
            ['openPopupAction']['popup']['menuPopupRenderer']['items']
            if item.get('menuServiceItemRenderer', {}).get('text', {}).get('runs', [{}])[0]['text'] == 'View game info'
        )
        game_info = info_popup['menuServiceItemRenderer']['command']['openPopupAction']['popup']['miniAppGameInfoDialogViewModel']
        
        image_url = vm['image']['sources'][0]['url']
        base_url_match = re.match(r'(https://[^/]+/v/[^/]+)', image_url)
        raw_game_url = base_url_match.group(1) if base_url_match else "null"

        game_url_suffix = vm['onTap']['innertubeCommand']['commandMetadata']['webCommandMetadata']['url']
        game_url = urljoin("https://www.youtube.com", game_url_suffix)

        info_row = {row['label']: row['value'] for row in game_info.get('infoRow', [])}
        developer = info_row.get('Developer', info_row.get('Publisher', ''))

        formatted = {
            "title": vm['title'],
            "description": game_info.get('description', ''),
            "developer": developer,
            "publisher": info_row.get('Publisher', ''),
            "publish_date": info_row.get('Publish date', ''),
            "raw_game_url": raw_game_url,
            "genre": vm.get('genre', ''),
            "image_url": image_url,
            "game_url": game_url
        }
        return formatted
    except Exception as e:
        print(f"error: {e}")
        return None

with open("all-playables.json", "r", encoding="utf-8") as f:
    raw_json = json.load(f)
formatted_games = [extract_game_info(obj) for obj in raw_json if extract_game_info(obj)]
with open("all-playables-formatted.json", "w") as w:
  w.write(json.dumps(formatted_games, indent=2).replace('"null"', "null"))
  print("finished")