# Earth Visualization with THREE.js

![Earth Visualization](example.png)

A simple interactive 3D Earth visualization using THREE.js, featuring US airports with address and traffic information. Inspired by [launchit.shanemielke.com](https://launchit.shanemielke.com) (MIT licensed).

[点击这里查看小组会1内容](小组会1.md)

## Features

- 🌍 Interactive 3D Earth model with realistic textures
- ✈️ Markers for major US airports with:
  - Airport names and codes
  - Location addresses
  - Passenger traffic information
- 📱 Mobile-friendly design with touch controls
- 🔍 Zoom functionality to explore locations in detail
- 🌗 Day/night cycle based on real-world time

## Demo

[View Live Demo](https://luxflamy.com)

## Installation

To run this project locally:

1. Clone the repository:
   ```bash
   git clone https://github.com/Luxflamy/earth-usa.git
   ```
2. Navigate to the project directory:
   ```bash
   cd earth-usa
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm start
   ```
5. Open your browser and visit `http://localhost:3000`

<!-- TODO npm start does not exist-->

## Usage

- **Desktop**: 
  - Left-click and drag to rotate the Earth
  - Right-click and drag to pan
  - Scroll to zoom in/out
  - Click on airport markers for details

- **Mobile**:
  - Touch and drag to rotate
  - Pinch to zoom
  - Tap markers for information

## Technologies Used

- [THREE.js](https://threejs.org/) - 3D JavaScript library
- [WebGL](https://get.webgl.org/) - Rendering context
- [GSAP](https://greensock.com/gsap/) - Animation library (optional)
- [Dat.GUI](https://github.com/dataarts/dat.gui) - Debug UI (optional)

## Data Sources

- Airport data from [OpenFlights](https://openflights.org/data.html)

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by [launchit.shanemielke.com](https://launchit.shanemielke.com) by Shane Mielke
- THREE.js community for amazing examples and support
- NASA for providing beautiful Earth imagery

## Contact

For questions or feedback, please contact:

Xiangyi Li - [xli2579@wisc.edu](xli2579@wisc.edu)
