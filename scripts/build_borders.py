#!/usr/bin/env python3
"""
Data pipeline to extract shared land borders between sovereign countries
from Natural Earth GIS datasets into lightweight JSON for client-side gameplay.
"""

import os
import json
import math
import re
import requests
from collections import defaultdict
from shapely.geometry import shape, mapping, Point, LineString, MultiLineString, Polygon, MultiPolygon
from shapely.ops import linemerge, unary_union, nearest_points

CACHE_DIR = "data_cache"
BOUNDARIES_URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_boundary_lines_land.geojson"
COUNTRIES_URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson"

BOUNDARIES_FILE = os.path.join(CACHE_DIR, "boundaries_10m.geojson")
COUNTRIES_FILE = os.path.join(CACHE_DIR, "countries_50m.geojson")

OUT_BORDERS_FILE = "src/data/borders.json"
OUT_WORLD_REVEAL_FILE = "src/data/world_reveal.json"

EXCLUDED_ENTITIES = {
    "Hong Kong", "Macao", "Siachen Glacier", "Baikonur", "Sint Maarten", "St-Martin",
    "Cyprus U.N. Buffer Zone", "Cyprus No Mans Area", "Brazilian Island", "Antarctica",
    "Vatican", "Monaco", "Gibraltar", "Akrotiri", "Dhekelia", "Clipperton I.", "Somaliland"
}

def download_if_missing(url, dest_path):
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    if not os.path.exists(dest_path) or os.path.getsize(dest_path) == 0:
        print(f"Downloading {url} -> {dest_path}...")
        r = requests.get(url, timeout=30)
        r.raise_for_status()
        with open(dest_path, "w", encoding="utf-8") as f:
            f.write(r.text)
        print(f"Saved {dest_path} ({os.path.getsize(dest_path)} bytes)")

def haversine_km(lon1, lat1, lon2, lat2):
    R = 6371.0088
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2)**2
    return 2 * R * math.asin(math.sqrt(max(0.0, min(1.0, a))))

def line_length_km(geom):
    total = 0.0
    if geom.geom_type == 'LineString':
        coords = list(geom.coords)
        for i in range(len(coords) - 1):
            total += haversine_km(coords[i][0], coords[i][1], coords[i+1][0], coords[i+1][1])
    elif geom.geom_type == 'MultiLineString':
        for line in geom.geoms:
            total += line_length_km(line)
    return total

def flatten_lines(geom):
    if geom.geom_type == 'LineString':
        return [geom]
    elif geom.geom_type == 'MultiLineString':
        return list(geom.geoms)
    return []

def slugify(text):
    text = re.sub(r'[^\w\s-]', '', text.lower()).strip()
    return re.sub(r'[-\s]+', '-', text)

def round_coords(coords, precision=4):
    if not coords:
        return []
    if isinstance(coords[0], (int, float)):
        return [round(coords[0], precision), round(coords[1], precision)]
    return [round_coords(c, precision) for c in coords]

def clean_geojson_geometry(geom_dict, precision=4):
    geom_type = geom_dict['type']
    coords = geom_dict['coordinates']
    return {
        'type': geom_type,
        'coordinates': round_coords(coords, precision)
    }

def main():
    print("=== Starting Border Game Data Pipeline ===")
    download_if_missing(BOUNDARIES_URL, BOUNDARIES_FILE)
    download_if_missing(COUNTRIES_URL, COUNTRIES_FILE)

    print("Loading datasets...")
    with open(BOUNDARIES_FILE, "r", encoding="utf-8") as f:
        boundaries_data = json.load(f)

    with open(COUNTRIES_FILE, "r", encoding="utf-8") as f:
        countries_data = json.load(f)

    # Index countries
    country_by_adm0 = {}
    country_by_name = {}
    country_features = {}

    for c in countries_data['features']:
        p = c['properties']
        name = p.get('NAME')
        if not name or name in EXCLUDED_ENTITIES or p.get('TYPE') == 'Dependency':
            continue
        c_geom = shape(c['geometry'])
        country_features[name] = {
            'props': p,
            'geom': c_geom,
            'name': name,
            'isoA2': p.get('ISO_A2') if p.get('ISO_A2') != '-99' else p.get('ISO_A2_EH', ''),
            'isoA3': p.get('ISO_A3') if p.get('ISO_A3') != '-99' else p.get('ADM0_A3', ''),
            'continent': p.get('CONTINENT', ''),
            'region': p.get('SUBREGION') or p.get('REGION_UN', '')
        }
        if p.get('ADM0_A3'): country_by_adm0[p['ADM0_A3']] = name
        if p.get('ISO_A3') and p['ISO_A3'] != '-99': country_by_adm0[p['ISO_A3']] = name
        if p.get('NAME'): country_by_name[p['NAME'].lower()] = name
        if p.get('NAME_LONG'): country_by_name[p['NAME_LONG'].lower()] = name
        if p.get('ADMIN'): country_by_name[p['ADMIN'].lower()] = name
        if p.get('SOVEREIGNT'): country_by_name[p['SOVEREIGNT'].lower()] = name

    # Merge Somaliland geometry into Somalia geometry so Somalia polygon is complete
    sol_feat = next((c for c in countries_data['features'] if c['properties'].get('NAME') == 'Somaliland' or c['properties'].get('ADM0_A3') == 'SOL'), None)
    if sol_feat and 'Somalia' in country_features:
        sol_geom = shape(sol_feat['geometry'])
        country_features['Somalia']['geom'] = unary_union([country_features['Somalia']['geom'], sol_geom])

    # Alias / fixup map for boundary records
    aliases = {
        'US1': 'United States of America',
        'USA': 'United States of America',
        'United States': 'United States of America',
        'Wat': 'Canada',
        'CAN': 'Canada',
        'RUS': 'Russia',
        'Russian Federation': 'Russia',
        'CHN': 'China',
        'SOL': 'Somalia',
        'Somaliland': 'Somalia',
        'Korea, North': 'North Korea',
        'Korea, South': 'South Korea',
        'Dem. Rep. Korea': 'North Korea',
        'Republic of Korea': 'South Korea',
        'United Republic of Tanzania': 'Tanzania',
        'Congo': 'Republic of the Congo',
        'Democratic Republic of the Congo': 'Dem. Rep. Congo',
        'Czech Republic': 'Czechia',
        'Macedonia': 'North Macedonia',
        'The Gambia': 'Gambia',
        'Cote d\'Ivoire': "Côte d'Ivoire",
        'Swaziland': 'eSwatini',
        'Timor-Leste': 'East Timor',
    }
    for k, v in aliases.items():
        country_by_adm0[k] = v
        country_by_name[k.lower()] = v

    def resolve_country_name(adm_name, adm_a3):
        if adm_a3 and adm_a3 in country_by_adm0:
            name = country_by_adm0[adm_a3]
            if name in country_features:
                return name
        if adm_name and adm_name.lower() in country_by_name:
            name = country_by_name[adm_name.lower()]
            if name in country_features:
                return name
        return None

    # Group boundaries by country pair
    pair_lines = defaultdict(list)
    all_boundary_records = []

    for b in boundaries_data['features']:
        p = b['properties']
        geom = shape(b['geometry'])
        c1_name = resolve_country_name(p.get('ADM0_LEFT'), p.get('ADM0_A3_L'))
        c2_name = resolve_country_name(p.get('ADM0_RIGHT'), p.get('ADM0_A3_R'))

        if not c1_name or not c2_name or c1_name == c2_name:
            continue

        pair_key = (min(c1_name, c2_name), max(c1_name, c2_name))
        flats = flatten_lines(geom)
        pair_lines[pair_key].extend(flats)
        for fl in flats:
            all_boundary_records.append((pair_key, fl))

    print(f"Grouped into {len(pair_lines)} raw sovereign country pairs.")

    borders_list = []

    # Process each pair
    for (name1, name2), lines in pair_lines.items():
        if not lines:
            continue

        c1 = country_features[name1]
        c2 = country_features[name2]

        # Merge line segments
        merged = linemerge(lines)
        sublines = flatten_lines(merged)

        # Filter out micro-segments (< 15 km) unless it's the only segment
        filtered_sublines = []
        for s in sublines:
            slen = line_length_km(s)
            if slen >= 15.0 or len(sublines) == 1:
                filtered_sublines.append((s, slen))

        if not filtered_sublines:
            continue

        filtered_sublines.sort(key=lambda x: x[1], reverse=True)
        total_len_km = sum(x[1] for x in filtered_sublines)

        # Require total length >= 25 km
        if total_len_km < 25.0:
            continue

        kept_geoms = [x[0] for x in filtered_sublines]
        if len(kept_geoms) == 1:
            main_geom = kept_geoms[0]
        else:
            main_geom = MultiLineString([list(g.coords) for g in kept_geoms])

        simplified_geom = main_geom.simplify(0.008, preserve_topology=True)
        if simplified_geom.is_empty:
            simplified_geom = main_geom

        primary_line = kept_geoms[0]

        # Calculate geodesic midpoint along primary line
        coords = list(primary_line.coords)
        cum_dists = [0.0]
        for i in range(len(coords) - 1):
            d = haversine_km(coords[i][0], coords[i][1], coords[i+1][0], coords[i+1][1])
            cum_dists.append(cum_dists[-1] + d)

        half_dist = cum_dists[-1] * 0.5
        midpoint = [coords[0][0], coords[0][1]]
        for i in range(len(coords) - 1):
            if cum_dists[i] <= half_dist <= cum_dists[i+1]:
                seg_d = cum_dists[i+1] - cum_dists[i]
                ratio = 0.5 if seg_d == 0 else (half_dist - cum_dists[i]) / seg_d
                midpoint = [
                    coords[i][0] + ratio * (coords[i+1][0] - coords[i][0]),
                    coords[i][1] + ratio * (coords[i+1][1] - coords[i][1])
                ]
                break

        # Endpoints & classification
        endpoints = []
        for s in kept_geoms:
            s_coords = list(s.coords)
            for pt in [s_coords[0], s_coords[-1]]:
                min_dist_3rd = float('inf')
                near_country = ""
                for other_pair, other_geom in all_boundary_records:
                    if other_pair == (name1, name2):
                        continue
                    if name1 in other_pair or name2 in other_pair:
                        third = other_pair[0] if other_pair[0] not in (name1, name2) else other_pair[1]
                        d_mid = haversine_km(pt[0], pt[1], other_geom.centroid.x, other_geom.centroid.y)
                        if d_mid < 800:
                            proj_pt = other_geom.interpolate(other_geom.project(Point(pt)))
                            d_actual = haversine_km(pt[0], pt[1], proj_pt.x, proj_pt.y)
                            if d_actual < min_dist_3rd:
                                min_dist_3rd = d_actual
                                near_country = third

                is_tripoint = min_dist_3rd < 25.0
                endpoints.append({
                    "coordinates": [round(pt[0], 4), round(pt[1], 4)],
                    "type": "tripoint" if is_tripoint else "coast",
                    "nearCountry": near_country if is_tripoint else ""
                })

        deduped_endpoints = []
        for ep in endpoints:
            if not any(haversine_km(ep['coordinates'][0], ep['coordinates'][1], dep['coordinates'][0], dep['coordinates'][1]) < 2.0 for dep in deduped_endpoints):
                deduped_endpoints.append(ep)

        # Side Anchors (Interior points comfortably offset from the border line)
        poly1 = c1['geom']
        poly2 = c2['geom']

        mx, my = midpoint[0], midpoint[1]
        pt_m = Point(mx, my)

        minx, miny, maxx, maxy = simplified_geom.bounds
        cos_lat = max(0.15, math.cos(math.radians(my)))
        dim = max(maxy - miny, (maxx - minx) * cos_lat)
        target_offset_deg = max(0.25, min(0.65, dim * 0.15))

        sideA_anchor = None
        for factor in [1.0, 0.75, 0.5, 0.25]:
            buf = simplified_geom.buffer(target_offset_deg * factor)
            diff1 = poly1.difference(buf)
            if not diff1.is_empty:
                p1, _ = nearest_points(diff1, pt_m)
                sideA_anchor = [round(p1.x, 4), round(p1.y, 4)]
                break
        if not sideA_anchor:
            rep = poly1.representative_point()
            sideA_anchor = [round(rep.x, 4), round(rep.y, 4)]

        sideB_anchor = None
        for factor in [1.0, 0.75, 0.5, 0.25]:
            buf = simplified_geom.buffer(target_offset_deg * factor)
            diff2 = poly2.difference(buf)
            if not diff2.is_empty:
                p2, _ = nearest_points(diff2, pt_m)
                sideB_anchor = [round(p2.x, 4), round(p2.y, 4)]
                break
        if not sideB_anchor:
            rep = poly2.representative_point()
            sideB_anchor = [round(rep.x, 4), round(rep.y, 4)]

        # Context Stubs
        context_stubs = []
        for ep in deduped_endpoints:
            ep_pt = Point(ep['coordinates'][0], ep['coordinates'][1])
            if ep['type'] == 'tripoint':
                # Grab adjacent border
                for other_pair, other_line in all_boundary_records:
                    if other_pair == (name1, name2):
                        continue
                    if name1 in other_pair or name2 in other_pair:
                        o_coords = list(other_line.coords)
                        d_start = haversine_km(ep_pt.x, ep_pt.y, o_coords[0][0], o_coords[0][1])
                        d_end = haversine_km(ep_pt.x, ep_pt.y, o_coords[-1][0], o_coords[-1][1])
                        stub_coords = None
                        if d_start < 20.0:
                            stub_coords = [list(o_coords[0])]
                            cur_d = 0.0
                            for k in range(len(o_coords) - 1):
                                step = haversine_km(o_coords[k][0], o_coords[k][1], o_coords[k+1][0], o_coords[k+1][1])
                                cur_d += step
                                stub_coords.append(list(o_coords[k+1]))
                                if cur_d >= 40.0 or len(stub_coords) >= 6:
                                    break
                        elif d_end < 20.0:
                            rev = list(reversed(o_coords))
                            stub_coords = [list(rev[0])]
                            cur_d = 0.0
                            for k in range(len(rev) - 1):
                                step = haversine_km(rev[k][0], rev[k][1], rev[k+1][0], rev[k+1][1])
                                cur_d += step
                                stub_coords.append(list(rev[k+1]))
                                if cur_d >= 40.0 or len(stub_coords) >= 6:
                                    break
                        if stub_coords and len(stub_coords) >= 2:
                            context_stubs.append(round_coords(stub_coords, 4))
                            if len(context_stubs) >= 4:
                                break
            else:
                # Coastal stub: walk along country polygon boundary away from shared border
                for poly in [poly1, poly2]:
                    bound = poly.boundary
                    proj_dist = bound.project(ep_pt)
                    # sample 30km outward in both directions to see which stays away from the border
                    for direction in [1, -1]:
                        test_pt = bound.interpolate(proj_dist + direction * (30.0 / 111.0))
                        # check that test_pt is not closer to the other border points
                        d_to_mid = haversine_km(test_pt.x, test_pt.y, mx, my)
                        d_ep_mid = haversine_km(ep_pt.x, ep_pt.y, mx, my)
                        if d_to_mid >= d_ep_mid * 0.9:
                            stub_pts = [
                                [round(ep_pt.x, 4), round(ep_pt.y, 4)],
                                [round(bound.interpolate(proj_dist + direction * (15.0 / 111.0)).x, 4),
                                 round(bound.interpolate(proj_dist + direction * (15.0 / 111.0)).y, 4)],
                                [round(test_pt.x, 4), round(test_pt.y, 4)]
                            ]
                            context_stubs.append(stub_pts)
                            break
                    if len(context_stubs) >= 4:
                        break

            if len(context_stubs) >= 4:
                break

        geom_json = clean_geojson_geometry(mapping(simplified_geom), precision=4)

        border_record = {
            "id": f"{slugify(name1)}-{slugify(name2)}",
            "countryA": {
                "name": c1['name'],
                "isoA2": c1['isoA2'],
                "isoA3": c1['isoA3'],
                "continent": c1['continent'],
                "region": c1['region']
            },
            "countryB": {
                "name": c2['name'],
                "isoA2": c2['isoA2'],
                "isoA3": c2['isoA3'],
                "continent": c2['continent'],
                "region": c2['region']
            },
            "lengthKm": round(total_len_km),
            "midpoint": [round(midpoint[0], 4), round(midpoint[1], 4)],
            "geometry": geom_json,
            "endpoints": deduped_endpoints,
            "sideAAnchor": sideA_anchor,
            "sideBAnchor": sideB_anchor,
            "contextStubs": context_stubs[:4]
        }

        borders_list.append(border_record)

    borders_list.sort(key=lambda b: b['lengthKm'], reverse=True)
    print(f"Total processed valid borders: {len(borders_list)}")

    with open(OUT_BORDERS_FILE, "w", encoding="utf-8") as f:
        json.dump(borders_list, f, separators=(',', ':'))
    print(f"Saved {OUT_BORDERS_FILE} ({os.path.getsize(OUT_BORDERS_FILE) / 1024:.1f} KB)")

    # Build world reveal GeoJSON
    print("Building lightweight world reveal GeoJSON...")
    world_features = []
    for c in countries_data['features']:
        p = c['properties']
        name = p.get('NAME')
        if not name or name in EXCLUDED_ENTITIES or p.get('TYPE') == 'Dependency':
            continue
        c_geom = shape(c['geometry'])
        simplified_world = c_geom.simplify(0.04, preserve_topology=True)
        if simplified_world.is_empty:
            simplified_world = c_geom

        world_features.append({
            "type": "Feature",
            "properties": {
                "name": name,
                "isoA2": p.get('ISO_A2') if p.get('ISO_A2') != '-99' else p.get('ISO_A2_EH', ''),
                "isoA3": p.get('ISO_A3') if p.get('ISO_A3') != '-99' else p.get('ADM0_A3', ''),
                "continent": p.get('CONTINENT', ''),
                "region": p.get('SUBREGION') or p.get('REGION_UN', '')
            },
            "geometry": clean_geojson_geometry(mapping(simplified_world), precision=3)
        })

    world_reveal = {
        "type": "FeatureCollection",
        "features": world_features
    }

    with open(OUT_WORLD_REVEAL_FILE, "w", encoding="utf-8") as f:
        json.dump(world_reveal, f, separators=(',', ':'))
    print(f"Saved {OUT_WORLD_REVEAL_FILE} ({os.path.getsize(OUT_WORLD_REVEAL_FILE) / 1024:.1f} KB)")
    print("=== Pipeline Complete ===")

if __name__ == '__main__':
    main()
