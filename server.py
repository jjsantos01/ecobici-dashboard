from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

def get_rides(start_time_ms=0, user_id=""):
    headers = {
        'accept': '*/*',
        'accept-language': 'es-ES,es;q=0.9,en;q=0.8',
        'cache-control': 'no-cache',
        'content-type': 'application/json',
        'origin': 'https://usuario.ecobici.cdmx.gob.mx',
        'pragma': 'no-cache',
        'priority': 'u=1, i',
        'referer': 'https://usuario.ecobici.cdmx.gob.mx/ride-history',
        'sec-ch-ua': '"Not)A;Brand";v="99", "Google Chrome";v="127", "Chromium";v="127"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'no-cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    }
    cookies = {
        'bfe-bssat-Ecobici': user_id,
    }

    data = {
        'operationName': 'GetCurrentUserRides',
        'variables': {
            'startTimeMs': str(start_time_ms),
        },
        'query': 'query GetCurrentUserRides($startTimeMs: String, $memberId: String) {\n  member(id: $memberId) {\n    rideHistory(startTimeMs: $startTimeMs) {\n  hasMore\n    rideHistoryList {\n        rideId\n        startTimeMs\n        endTimeMs\n         duration\n     startAddressStr\n  endAddressStr\n distance {\n value \n} \n}\n __typename\n    }\n    __typename\n  }\n}',
    }

    response = requests.post('https://usuario.ecobici.cdmx.gob.mx/bikesharefe-gql',
                             headers=headers,
                             json=data,
                             cookies=cookies)

    if response.status_code != 200:
        return None, f"Error: {response.status_code}"

    response_data = response.json()
    output = {
        'data': response_data['data']['member']['rideHistory']['rideHistoryList'],
        'hasMore': response_data['data']['member']['rideHistory']['hasMore']
    }

    return output

def get_n_rides(user_id, n_viajes=10):
    all_rides = []
    max_page = (n_viajes - 10) // 10
    start_time_ms = 0
    pages = 0
    resp = get_rides(start_time_ms, user_id)
    all_rides.extend(resp["data"])
    while (resp["hasMore"]) & (pages < max_page):
        start_time_ms += 10
        resp = get_rides(start_time_ms, user_id)
        all_rides.extend(resp["data"])
        pages += 1
    return all_rides, None

@app.route('/get_rides', methods=['POST'])
def proxy_get_rides():
    data = request.json
    n_viajes = int(data.get('nRides', 10))
    user_id = data.get('userId', "")

    result, error = get_n_rides(user_id, n_viajes)

    if error:
        return jsonify({'error': error}), 400

    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True, )
