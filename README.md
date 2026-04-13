# travelmap

[![license: MPL-2.0](https://img.shields.io/badge/license-MPL--2.0-blue)](LICENSE)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)

An interactive world map for tracking family travels and residency history.

## Table of Contents

- [Background](#background)
- [Install](#install)
- [Usage](#usage)
- [Maintainers](#maintainers)
- [License](#license)

## Background

This project provides a simple, self-hosted web application to visualize where people have lived and traveled. It uses Leaflet.js to render a world map with dynamic, multi-colored markers that represent the union of visitors for each location.

Key features include:

- **Dynamic Pie Markers**: "Conic-gradient" CSS markers showing which people visited a location.
- **Residency Support**: "Lived" locations are distinguished with a black border.
- **Flexible Travel History**: Supports single dates, date ranges, and fuzzy dates (e.g., "Summer 2023").
- **System-Aware Theme**: UI elements (legend, popups, controls) automatically adapt to light/dark mode system preferences.
- **Interactive Management**: A Python-based CLI for searching and adding new locations via geocoding.

## Install

This project requires `python3` for the local development server and management script.

1. Clone the repository to your local machine.
2. Ensure you have an internet connection for Leaflet.js CDN assets and geocoding.

## Usage

### Deploy to a web server

Copy the contents of the /site folder to the web root of your server.

### Viewing the Map

Run the following command to start a local server and open the map in your default browser:

```bash
make run
```

### Adding a New Visit or Residency

Run the interactive management script to add new entries to `locations.json`:

```bash
make add-visit
```

The script will guide you through:

1. Searching for a location (automatically fetches coordinates).
2. Selecting people.
3. Choosing between "Visited" or "Lived".
4. Entering dates or date ranges.
5. Confirming the entry via a sanity check.

## Contributing

> Contributors to this project adhere to the [Code of Conduct](CONDUCT.md).

Contributions should [use git with discipline](https://drewdevault.com/2019/02/25/Using-git-with-discipline.html).

## License

Copyright &copy; 2019 @stick.
Where not otherwise specified, this repository is licensed under the [Mozilla Public License 2.0](LICENSE).
