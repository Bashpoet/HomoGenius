import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import * as math from 'mathjs';

const HomogeneousODEExplorer = () => {
  // State for equation and solution parameters
  const [equationInput, setEquationInput] = useState("(y^2 + xy)/x^2");
  const [parsedEquation, setParsedEquation] = useState({ numerator: "y^2 + xy", denominator: "x^2" });
  const [isHomogeneous, setIsHomogeneous] = useState(true);
  const [homogeneityCheckMessage, setHomogeneityCheckMessage] = useState("");
  const [constantValue, setConstantValue] = useState(2);
  const [selectedCurve, setSelectedCurve] = useState(null);
  
  // Initial conditions for numerical integration
  const [x0, setX0] = useState(1);
  const [y0, setY0] = useState(1);
  const [showTrajectory, setShowTrajectory] = useState(false);
  const [trajectories, setTrajectories] = useState([]);
  
  // UI state
  const [step, setStep] = useState(0);
  const [showSubstitution, setShowSubstitution] = useState(false);
  const [showScaleInvariance, setShowScaleInvariance] = useState(false);
  const [scaleFactor, setScaleFactor] = useState(2);
  const [transformAnimation, setTransformAnimation] = useState(false);
  const [showTooltip, setShowTooltip] = useState(null);
  const [viewMode, setViewMode] = useState("solution"); // solution, phase, direction
  const [errorMessage, setErrorMessage] = useState("");
  const [logScale, setLogScale] = useState(false);
  
  // Refs for visualization
  const svgRef = useRef();
  const tooltipRef = useRef();
  
  // Dimensions
  const width = 380;
  const height = 380;
  const margin = { top: 20, right: 20, bottom: 40, left: 40 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  
  // Educational content
  const tooltips = {
    homogeneous: "A differential equation y' = f(y/x) is homogeneous if f(λx, λy) = f(x,y) for any λ ≠ 0. This means the equation is invariant under scaling transformations. Note: Our tool checks this numerically with test values, not through symbolic proof.",
    substitution: "The substitution u = y/x transforms a homogeneous ODE into a separable equation, making it solvable through standard integration techniques.",
    scaleInvariance: "Scale invariance means that if y = f(x) is a solution, then y = λf(x/λ) is also a solution for any λ ≠ 0. This is a unique property of homogeneous ODEs.",
    solutionCurves: "Each curve represents a different solution to the ODE, corresponding to different values of the integration constant C.",
    phaseSpace: "The phase plane shows the direction field of the ODE, indicating how solutions evolve at each point in the x-y plane. Arrows show the direction of flow.",
  };
  
  // Substitution steps for our example
  const steps = [
    "Original equation: y' = (y^2 + xy)/x^2",
    "Verify homogeneity: Scale x → λx, y → λy",
    "Substitution: Let u = y/x, so y = ux",
    "Differentiate: y' = u + x(du/dx)",
    "Substitute into original equation",
    "Rearrange to isolate du/dx",
    "Separate variables: du/u^2 = dx/x",
    "Integrate both sides",
    "Solve for u, then for y = ux"
  ];
  
  const substitutionDetails = [
    "Our starting equation is y' = (y^2 + xy)/x^2",
    "Testing homogeneity: Replace x→λx, y→λy\n(λ²y² + λ²xy)/(λ²x²) = (y² + xy)/x²\nThis simplifies to the original equation, confirming homogeneity",
    "Let u = y/x, which means y = ux\nThis substitution exploits the scale invariance property",
    "Using the product rule to differentiate y = ux:\ny' = d(ux)/dx = u + x(du/dx)",
    "Substituting into our original equation:\nu + x(du/dx) = (u²x² + ux²)/x² = u² + u",
    "Rearranging to isolate the derivative term:\nx(du/dx) = u² + u - u = u²\ndu/dx = u²/x",
    "Separating variables to prepare for integration:\ndu/u² = dx/x",
    "Integrating both sides:\n∫(du/u²) = ∫(dx/x)\n-1/u = ln|x| + C",
    "Solving for u, then substituting back:\nu = -1/(ln|x| + C)\ny = ux = -x/(ln|x| + C)"
  ];
  
  // Animation frames for substitution steps
  const substitutionAnimations = [
    <div className="text-2xl font-light text-center my-4 transition-all duration-500 transform">
      y' = <span className="text-blue-600">(y² + xy)</span>/<span className="text-green-600">x²</span>
    </div>,
    
    <div className="text-2xl font-light text-center my-4 transition-all duration-500 transform">
      y' = <span className="text-blue-600">(λ²y² + λ²xy)</span>/<span className="text-green-600">λ²x²</span> = 
      <span className="text-blue-600">(y² + xy)</span>/<span className="text-green-600">x²</span>
    </div>,
    
    <div className="text-2xl font-light text-center my-4 transition-all duration-500 transform">
      Let <span className="text-purple-600">u = y/x</span>, so <span className="text-purple-600">y = ux</span>
    </div>,
    
    <div className="text-2xl font-light text-center my-4 transition-all duration-500 transform">
      If <span className="text-purple-600">y = ux</span> then <br/>
      <span className="text-red-500">y' = u + x(du/dx)</span>
    </div>,
    
    <div className="text-2xl font-light text-center my-4 transition-all duration-500 transform">
      <span className="text-red-500">u + x(du/dx)</span> = 
      <span className="text-blue-600">((ux)² + x(ux))</span>/<span className="text-green-600">x²</span> = 
      <span className="text-blue-600">(u²x² + ux²)</span>/<span className="text-green-600">x²</span> = 
      <span className="text-blue-600">u² + u</span>
    </div>,
    
    <div className="text-2xl font-light text-center my-4 transition-all duration-500 transform">
      <span className="text-red-500">u + x(du/dx)</span> = <span className="text-blue-600">u² + u</span>
      <br/>
      <span className="text-red-500">x(du/dx)</span> = <span className="text-blue-600">u² + u - u = u²</span>
      <br/>
      <span className="text-red-500">du/dx = u²/x</span>
    </div>,
    
    <div className="text-2xl font-light text-center my-4 transition-all duration-500 transform">
      <span className="text-red-500">du/u²</span> = <span className="text-blue-600">dx/x</span>
    </div>,
    
    <div className="text-2xl font-light text-center my-4 transition-all duration-500 transform">
      <span className="text-red-500">∫(du/u²)</span> = <span className="text-blue-600">∫(dx/x)</span>
      <br/>
      <span className="text-red-500">-1/u</span> = <span className="text-blue-600">ln|x| + C</span>
    </div>,
    
    <div className="text-2xl font-light text-center my-4 transition-all duration-500 transform">
      <span className="text-red-500">u = -1/(ln|x| + C)</span>
      <br/>
      <span className="text-red-500">y = ux = -x/(ln|x| + C)</span>
    </div>
  ];
  
  // Parse and validate the equation input
  useEffect(() => {
    try {
      const parsed = parseEquation(equationInput);
      setParsedEquation(parsed);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(`${error.message}. Try something like '(y^2 + x*y)/x^2' or 'sin(x*y)/x^2'`);
    }
  }, [equationInput]);
  
  // Generate numerical trajectory from initial conditions
  const generateTrajectory = useCallback(() => {
    if (!isHomogeneous) {
      console.log("Cannot generate trajectory for non-homogeneous equation");
      return [];
    }
    
    const trajectory = [];
    let currentX = x0;
    let currentY = y0;
    
    // Add initial point
    trajectory.push([currentX, currentY]);
    
    // Define the ODE: dy/dx = f(x,y)
    const dyDx = (x, y) => {
      try {
        // Skip if x is too close to zero (avoid division by zero)
        if (Math.abs(x) < 1e-10) return 0;
        
        return evaluateExpression(parsedEquation.numerator, x, y) / 
               evaluateExpression(parsedEquation.denominator, x, y);
      } catch (e) {
        return 0;
      }
    };
    
    // Forward integration
    const stepSize = 0.05;
    for (let i = 0; i < 200 && Math.abs(currentX) < 10 && Math.abs(currentY) < 10; i++) {
      // Use Runge-Kutta to calculate next y value
      const nextY = rungeKutta4(currentX, currentY, stepSize, dyDx);
      currentX += stepSize;
      currentY = nextY;
      
      // Add point to trajectory
      trajectory.push([currentX, currentY]);
    }
    
    // Reset and do backward integration
    currentX = x0;
    currentY = y0;
    
    // Backward integration
    for (let i = 0; i < 200 && Math.abs(currentX) < 10 && Math.abs(currentY) < 10; i++) {
      // Use Runge-Kutta to calculate previous y value
      const prevY = rungeKutta4(currentX, currentY, -stepSize, dyDx);
      currentX -= stepSize;
      currentY = prevY;
      
      // Only add if not too far away
      if (Math.abs(currentX) < 10 && Math.abs(currentY) < 10) {
        trajectory.unshift([currentX, currentY]);
      }
    }
    
    return trajectory;
  }, [parsedEquation, x0, y0, isHomogeneous]);
  
  // Update trajectory when initial conditions change
  useEffect(() => {
    if (showTrajectory) {
      const newTrajectory = generateTrajectory();
      setTrajectories([...trajectories, { points: newTrajectory, color: getRandomColor() }]);
    }
  }, [x0, y0, showTrajectory, generateTrajectory]);
  
  // Generate a random color for new trajectories
  const getRandomColor = () => {
    const colors = ['#3b82f6', '#16a34a', '#ef4444', '#eab308', '#8b5cf6', '#ec4899'];
    return colors[Math.floor(Math.random() * colors.length)];
  };
  
  // Check if the equation is homogeneous whenever it changes
  useEffect(() => {
    const isHomo = checkHomogeneity();
    setIsHomogeneous(isHomo);
    
    if (isHomo) {
      setHomogeneityCheckMessage("✓ This is a homogeneous equation! The u = y/x substitution will work.");
    } else {
      setHomogeneityCheckMessage("✗ This is not a homogeneous equation. Try adjusting the terms to ensure scaling invariance.");
    }
  }, [parsedEquation]);
  
  // Draw the visualization with performance optimizations
  useEffect(() => {
    if (!svgRef.current) return;
    
    // Use requestAnimationFrame for better performance
    const renderFrame = () => {
      // Clear previous drawing
      d3.select(svgRef.current).selectAll("*").remove();
      
      const svg = d3.select(svgRef.current)
        .attr("role", "img")
        .attr("aria-label", viewMode === 'solution' 
          ? "Graph showing solution curves for the homogeneous differential equation" 
          : "Phase plane showing direction field of the differential equation")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Create scales - use log scale if enabled
    const xScale = logScale && viewMode === "solution"
      ? d3.scaleLog()
          .domain([0.01, 5])
          .range([0, innerWidth])
      : d3.scaleLinear()
          .domain([-5, 5])
          .range([0, innerWidth]);
    
    const yScale = d3.scaleLinear()
      .domain([-5, 5])
      .range([innerHeight, 0]);
    
    // Add axes
    svg.append("g")
      .attr("transform", `translate(0,${innerHeight/2})`)
      .call(d3.axisBottom(xScale).ticks(5))
      .attr("color", "#666");
    
    svg.append("g")
      .attr("transform", `translate(${innerWidth/2},0)`)
      .call(d3.axisLeft(yScale).ticks(5))
      .attr("color", "#666");
    
    // Add coordinate system lines
    svg.append("line")
      .attr("x1", 0)
      .attr("y1", innerHeight/2)
      .attr("x2", innerWidth)
      .attr("y2", innerHeight/2)
      .attr("stroke", "#ccc")
      .attr("stroke-width", 1);
    
    svg.append("line")
      .attr("x1", innerWidth/2)
      .attr("y1", 0)
      .attr("x2", innerWidth/2)
      .attr("y2", innerHeight)
      .attr("stroke", "#ccc")
      .attr("stroke-width", 1);
    
    // Draw solution curves based on view mode
    if (viewMode === "solution") {
      // For our example homogeneous ODE: y' = (y^2 + xy)/x^2
      const drawSolutionCurve = (C, isSelected = false, color = null) => {
        const actualColor = color || (isSelected ? "#e11d48" : "#3b82f6");
        const points = [];
        for (let x = 0.1; x <= 5; x += 0.1) {
          // Solution: y = x/(-ln|x| + C)
          const y = x/(-Math.log(Math.abs(x)) + C);
          if (Math.abs(y) < 10) {
            points.push([x, y]);
            points.push([-x, -y]); // Symmetry for negative x
          }
        }
        
        const line = d3.line()
          .x(d => xScale(d[0]))
          .y(d => yScale(d[1]))
          .curve(d3.curveBasis);
        
        const path = svg.append("path")
          .attr("d", line(points))
          .attr("fill", "none")
          .attr("stroke", actualColor)
          .attr("stroke-width", isSelected ? 3 : 2)
          .attr("stroke-dasharray", isSelected ? "0" : "0");
        
        if (isSelected) {
          // Add animation effect for selected curve
          path.transition()
            .duration(1000)
            .attr("stroke-dashoffset", 0)
            .attr("stroke-dasharray", "0")
            .on("end", () => {
              path.transition()
                .duration(1000)
                .attr("stroke-width", 3);
            });
        }
      };
      
      // Draw family of solution curves
      for (let i = -2; i <= 5; i++) {
        if (i !== constantValue) {
          drawSolutionCurve(i, false);
        }
      }
      
      // Draw the selected solution curve
      drawSolutionCurve(constantValue, true);
      
      // For scale invariance demonstration
      if (showScaleInvariance) {
        // Original solution curve
        drawSolutionCurve(constantValue, true, "#16a34a");
        
        // If animation is active, show transformed curve
        if (transformAnimation) {
          // For homogeneous ODEs, scaling produces the same solution family
          drawSolutionCurve(constantValue, false, "#ef4444");
          
          // Add visual elements showing the scaling transformation
          svg.append("circle")
            .attr("cx", xScale(2))
            .attr("cy", yScale(2/(-Math.log(2) + constantValue)))
            .attr("r", 5)
            .attr("fill", "#16a34a");
          
          svg.append("circle")
            .attr("cx", xScale(2 * scaleFactor))
            .attr("cy", yScale(2 * scaleFactor/(-Math.log(2 * scaleFactor) + constantValue)))
            .attr("r", 5)
            .attr("fill", "#ef4444");
          
          // Add an arrow connecting the points
          const x1 = 2;
          const y1 = 2/(-Math.log(2) + constantValue);
          const x2 = 2 * scaleFactor;
          const y2 = 2 * scaleFactor/(-Math.log(2 * scaleFactor) + constantValue);
          
          svg.append("path")
            .attr("d", `M${xScale(x1)},${yScale(y1)} L${xScale(x2)},${yScale(y2)}`)
            .attr("stroke", "#9333ea")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "5,5")
            .attr("marker-end", "url(#arrow)");
        }
        
        // Add legend for scale invariance
        svg.append("circle")
          .attr("cx", innerWidth - 120)
          .attr("cy", 20)
          .attr("r", 5)
          .attr("fill", "#16a34a");
        
        svg.append("text")
          .attr("x", innerWidth - 110)
          .attr("y", 25)
          .text("Original")
          .attr("font-size", "12px");
        
        svg.append("circle")
          .attr("cx", innerWidth - 120)
          .attr("cy", 40)
          .attr("r", 5)
          .attr("fill", "#ef4444");
        
        svg.append("text")
          .attr("x", innerWidth - 110)
          .attr("y", 45)
          .text(`Scaled (λ=${scaleFactor})`)
          .attr("font-size", "12px");
        
        // Define arrow marker
        svg.append("defs").append("marker")
          .attr("id", "arrow")
          .attr("viewBox", "0 -5 10 10")
          .attr("refX", 8)
          .attr("refY", 0)
          .attr("markerWidth", 6)
          .attr("markerHeight", 6)
          .attr("orient", "auto")
          .append("path")
          .attr("d", "M0,-5L10,0L0,5")
          .attr("fill", "#9333ea");
      }
    } else if (viewMode === "phase") {
      // Phase plane visualization (vector field) - optimized for performance
      const vectors = [];
      const spacing = window.innerWidth <= 768 ? 1.2 : 0.8; // Adjust density based on screen size
      
      // Calculate vector field more efficiently
      for (let i = -4; i <= 4; i += spacing) {
        for (let j = -4; j <= 4; j += spacing) {
          // Skip points too close to the y-axis to avoid division by zero
          if (Math.abs(i) < 0.1) continue;
          
          const x = i;
          const y = j;
          
          try {
            // Calculate dy/dx using our ODE equation
            const dyDx = evaluateExpression(parsedEquation.numerator, x, y) / 
                         evaluateExpression(parsedEquation.denominator, x, y);
            
            // Check for valid dyDx (not NaN or Infinity)
            if (!isFinite(dyDx)) continue;
            
            // Calculate magnitude and angle
            const mag = Math.min(Math.sqrt(1 + dyDx*dyDx), 3);
            const angle = Math.atan2(dyDx, 1);
            
            // Scale arrow length based on magnitude (but keep it visually meaningful)
            const baseLength = 0.3;
            const scaledLength = baseLength * (0.5 + 0.5 * Math.min(mag, 5) / 5);
            
            vectors.push({
              x,
              y,
              dx: scaledLength * Math.cos(angle),
              dy: scaledLength * Math.sin(angle),
              magnitude: mag
            });
          } catch (e) {
            // Skip points that cause evaluation errors
            continue;
          }
        }
      }
      
      // Draw the vectors with color intensity based on magnitude
      svg.selectAll("line.vector")
        .data(vectors)
        .enter()
        .append("line")
        .attr("class", "vector")
        .attr("x1", d => xScale(d.x))
        .attr("y1", d => yScale(d.y))
        .attr("x2", d => xScale(d.x + d.dx))
        .attr("y2", d => yScale(d.y + d.dy))
        .attr("stroke", d => {
          // Color intensity based on magnitude
          const intensity = Math.min(1, d.magnitude / 5);
          return d3.interpolateBlues(0.3 + 0.7 * intensity);
        })
        .attr("stroke-width", d => 1 + d.magnitude / 5)
        .attr("marker-end", "url(#arrowhead)");
        
      // Draw user trajectories if any
      if (trajectories.length > 0) {
        trajectories.forEach(trajectory => {
          const line = d3.line()
            .x(d => xScale(d[0]))
            .y(d => yScale(d[1]))
            .curve(d3.curveBasis);
            
          svg.append("path")
            .attr("d", line(trajectory.points))
            .attr("fill", "none")
            .attr("stroke", trajectory.color)
            .attr("stroke-width", 2.5)
            .attr("stroke-opacity", 0.8);
            
          // Add dot at initial condition
          svg.append("circle")
            .attr("cx", xScale(trajectory.points[Math.floor(trajectory.points.length / 2)][0]))
            .attr("cy", yScale(trajectory.points[Math.floor(trajectory.points.length / 2)][1]))
            .attr("r", 4)
            .attr("fill", trajectory.color);
        });
      }
      
      // Define arrowhead marker
      svg.append("defs").append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 8)
        .attr("refY", 0)
        .attr("markerWidth", 4)
        .attr("markerHeight", 4)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#3b82f6");
      
      // Draw a few solution curves for reference
      const drawSolutionCurve = (C, color = "#16a34a") => {
        const points = [];
        for (let x = 0.1; x <= 5; x += 0.1) {
          // Solution: y = x/(-ln|x| + C)
          const y = x/(-Math.log(Math.abs(x)) + C);
          if (Math.abs(y) < 10) {
            points.push([x, y]);
            points.push([-x, -y]); // Symmetry for negative x
          }
        }
        
        const line = d3.line()
          .x(d => xScale(d[0]))
          .y(d => yScale(d[1]))
          .curve(d3.curveBasis);
        
        svg.append("path")
          .attr("d", line(points))
          .attr("fill", "none")
          .attr("stroke", color)
          .attr("stroke-width", 2)
          .attr("stroke-opacity", 0.7);
      };
      
      // Draw some representative solution curves
      drawSolutionCurve(constantValue, "#e11d48");
      drawSolutionCurve(constantValue - 2, "#16a34a");
      drawSolutionCurve(constantValue + 2, "#16a34a");
    }
    };
    
    requestAnimationFrame(renderFrame);
  }, [viewMode, showScaleInvariance, scaleFactor, transformAnimation, constantValue, logScale, trajectories]);
  
  // Attempt a symbolic check of homogeneity if possible
  const checkHomogeneitySymbolic = () => {
    try {
      const { numerator, denominator } = parsedEquation;
      
      // Create a symbolic lambda variable
      const lambda = 'λ';
      
      // Replace x and y with λx and λy in the expressions
      const scaledNumerator = numerator
        .replace(/\b([xy])\b/g, `${lambda}*$1`) // Replace standalone x and y
        .replace(/\b([xy])\^(\d+)/g, `(${lambda}*$1)^$2`); // Handle powers correctly
      
      const scaledDenominator = denominator
        .replace(/\b([xy])\b/g, `${lambda}*$1`)
        .replace(/\b([xy])\^(\d+)/g, `(${lambda}*$1)^$2`);
      
      // Use math.js to simplify the original equation
      const originalExpr = `(${numerator})/(${denominator})`;
      const originalSimplified = math.simplify(originalExpr);
      
      // Use math.js to simplify the scaled equation
      const scaledExpr = `(${scaledNumerator})/(${scaledDenominator})`;
      const scaledSimplified = math.simplify(scaledExpr);
      
      // Check if λ cancels out after scaling
      // A truly homogeneous equation would simplify to exactly the same form
      // after substituting λx and λy for x and y
      
      // Handle simple cases where we can directly compare the simplified expressions
      if (originalSimplified.toString() === scaledSimplified.toString().replace(new RegExp(lambda, 'g'), '')) {
        return true;
      }
      
      // If symbolic check is inconclusive, fall back to numerical check
      return checkHomogeneityNumerical();
    } catch (error) {
      console.error("Error in symbolic homogeneity check:", error);
      // If symbolic check fails, fall back to numerical check
      return checkHomogeneityNumerical();
    }
  };
  
  // Check if an equation is homogeneous using numerical testing
  const checkHomogeneityNumerical = () => {
    try {
      // Use a more comprehensive set of test points for greater confidence
      const testPoints = [
        { x: 2, y: 3 },    // Standard test point
        { x: 1, y: -1 },   // Negative y
        { x: -2, y: 2 },   // Negative x
        { x: -3, y: -4 },  // Both negative
        { x: 0.1, y: 0.2 }, // Near zero
        { x: 10, y: 20 },  // Larger values
        { x: 1, y: 0 },    // Zero y
        { x: 0.001, y: 100 } // Very different scales
      ];
      
      const lambdaValues = [0.1, 0.5, 2, 5, 10];
      
      // Extract equation parts
      const { numerator, denominator } = parsedEquation;
      
      // Test each point with each lambda value
      for (const point of testPoints) {
        const { x, y } = point;
        
        // Skip cases where x is zero (to avoid division by zero)
        if (Math.abs(x) < 1e-10) continue;
        
        try {
          const original = evaluateExpression(numerator, x, y) / evaluateExpression(denominator, x, y);
          
          for (const lambda of lambdaValues) {
            const scaled = evaluateExpression(numerator, lambda*x, lambda*y) / 
                          evaluateExpression(denominator, lambda*x, lambda*y);
            
            // If any test point fails by a significant margin, the equation is not homogeneous
            if (Math.abs(original - scaled) > 0.001) {
              console.log(`Failed at point (${x}, ${y}) with λ=${lambda}`);
              return false;
            }
          }
        } catch (e) {
          // Skip points that cause evaluation errors
          continue;
        }
      }
      
      // All tests passed
      return true;
    } catch (error) {
      console.error("Error in numerical homogeneity check:", error);
      return false;
    }
  };
  
  // Combined homogeneity check using both symbolic and numerical approaches
  const checkHomogeneity = () => {
    // Try symbolic approach first (more rigorous)
    return checkHomogeneitySymbolic();
  };
  
  // Function to parse and simplify a mathematical expression
  const parseEquation = (input) => {
    try {
      // Handle common input formats
      let processedInput = input
        .replace(/\s+/g, '') // Remove spaces
        .replace(/(\d)([xy])/g, '$1*$2') // Add explicit multiplication: 2x → 2*x
        .replace(/([xy])(\d)/g, '$1*$2') // Add explicit multiplication: x2 → x*2
        .replace(/\)\(/g, ')*('); // Add explicit multiplication: )(→ )*(
      
      // Check if input contains division
      if (processedInput.includes('/')) {
        const [numerator, denominator] = processedInput.split('/');
        return {
          numerator: math.parse(numerator).toString(),
          denominator: math.parse(denominator).toString(),
          original: processedInput
        };
      } else {
        return {
          numerator: math.parse(processedInput).toString(),
          denominator: "1",
          original: processedInput
        };
      }
    } catch (error) {
      console.error("Error parsing equation:", error);
      throw new Error(`Invalid equation format: ${error.message}`);
    }
  };
  
  // Function to evaluate a mathematical expression with x and y values
  const evaluateExpression = (expr, x, y) => {
    try {
      // Handle special functions and properly evaluate
      const processedExpr = expr
        .replace(/sin/g, 'Math.sin')
        .replace(/cos/g, 'Math.cos')
        .replace(/tan/g, 'Math.tan')
        .replace(/exp/g, 'Math.exp')
        .replace(/log/g, 'Math.log');
        
      // Parse and compile for efficient evaluation
      const node = math.parse(processedExpr);
      const compiled = node.compile();
      return compiled.evaluate({ x, y });
    } catch (error) {
      console.error("Error evaluating expression:", error);
      return NaN;
    }
  };
  
  // Runge-Kutta 4th order method for numerical integration
  const rungeKutta4 = (x, y, h, dyDx) => {
    // RK4 implementation for ODE
    const k1 = dyDx(x, y);
    const k2 = dyDx(x + h/2, y + k1*h/2);
    const k3 = dyDx(x + h/2, y + k2*h/2);
    const k4 = dyDx(x + h, y + k3*h);
    
    return y + (h/6) * (k1 + 2*k2 + 2*k3 + k4);
  };
  
  // Handle tooltip display
  const showInfoTooltip = (key) => {
    setShowTooltip(key);
  };
  
  const hideInfoTooltip = () => {
    setShowTooltip(null);
  };
  
  return (
    <div className="flex flex-col p-4 bg-white rounded-lg shadow-lg max-w-4xl mx-auto" role="application" aria-label="Homogeneous Differential Equation Explorer">
      <h2 className="text-2xl font-bold mb-4 text-center">Homogeneous ODE Explorer</h2>
      
      {/* Error message display */}
      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4" role="alert" aria-live="assertive">
          {errorMessage}
        </div>
      )}
      
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-2 flex items-center">
            Equation Builder
            <button 
              className="ml-2 w-5 h-5 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-sm"
              onMouseEnter={() => showInfoTooltip('homogeneous')}
              onMouseLeave={hideInfoTooltip}
            >
              ?
            </button>
          </h3>
          
          {/* Unified equation input */}
          <div className="flex items-center mb-2">
            <label htmlFor="equation-input" className="mr-2">y' = </label>
            <input
              id="equation-input"
              type="text"
              value={equationInput}
              onChange={(e) => setEquationInput(e.target.value)}
              className="border rounded p-2 w-full"
              placeholder="Enter equation, e.g. (y^2 + xy)/x^2"
              aria-label="Differential equation input"
              aria-describedby="equation-help"
            />
          </div>
          <div id="equation-help" className="sr-only">
            Enter a differential equation in the form of a fraction or expression. The tool will check if it's homogeneous.
          </div>
          
          {/* Homogeneity check result */}
          <div 
            className={`p-2 rounded mb-3 text-sm ${isHomogeneous ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}
            role="status"
            aria-live="polite"
          >
            {homogeneityCheckMessage}
          </div>
          
          {/* Control buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button 
              className={`${showSubstitution ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white px-3 py-1 rounded transition flex-1`}
              onClick={() => setShowSubstitution(!showSubstitution)}
            >
              {showSubstitution ? 'Hide Substitution' : 'Show Substitution'}
            </button>
            
            <button 
              className={`${showScaleInvariance ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white px-3 py-1 rounded transition flex-1`}
              onClick={() => setShowScaleInvariance(!showScaleInvariance)}
            >
              {showScaleInvariance ? 'Hide Scale Invariance' : 'Show Scale Invariance'}
            </button>
          </div>
          
          {/* View mode selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Visualization Type:</label>
            <div className="flex gap-2">
              <button 
                className={`px-3 py-1 rounded flex-1 ${viewMode === 'solution' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                onClick={() => setViewMode('solution')}
              >
                Solution Curves
              </button>
              <button 
                className={`px-3 py-1 rounded flex-1 ${viewMode === 'phase' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                onClick={() => setViewMode('phase')}
              >
                Phase Plane
              </button>
            </div>
          </div>
          
          {/* Scale options */}
          {viewMode === 'solution' && (
            <div className="mb-4">
              <div className="flex items-center">
                <input
                  id="log-scale"
                  type="checkbox"
                  checked={logScale}
                  onChange={() => setLogScale(!logScale)}
                  className="mr-2"
                />
                <label htmlFor="log-scale" className="text-sm">
                  Use logarithmic x-axis
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Useful for visualizing solutions with ln(x) terms
              </p>
            </div>
          )}
          
          {/* Solution curve customization */}
          <div className="mb-4">
            <label htmlFor="constant-slider" className="block text-sm font-medium mb-1">
              Integration Constant (C):
            </label>
            <div className="flex gap-2 items-center">
              <input
                id="constant-slider"
                type="range"
                min="-4"
                max="8"
                step="0.5"
                value={constantValue}
                onChange={(e) => setConstantValue(parseFloat(e.target.value))}
                className="flex-1"
                aria-valuemin="-4"
                aria-valuemax="8"
                aria-valuenow={constantValue}
                aria-valuetext={`Constant C equals ${constantValue.toFixed(1)}`}
              />
              <span className="w-8 text-center" aria-hidden="true">{constantValue.toFixed(1)}</span>
            </div>
          </div>
          
          {/* Scale invariance controls */}
          {showScaleInvariance && (
            <div className="mb-4 p-3 bg-blue-50 rounded">
              <label className="block text-sm font-medium mb-1">
                Scaling Factor (λ):
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="range"
                  min="0.5"
                  max="4"
                  step="0.1"
                  value={scaleFactor}
                  onChange={(e) => setScaleFactor(parseFloat(e.target.value))}
                  className="flex-1"
                />
                <span className="w-8 text-center">{scaleFactor.toFixed(1)}</span>
              </div>
              
              <button 
                className={`mt-2 w-full py-1 px-3 rounded ${transformAnimation ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-500 hover:bg-indigo-600'} text-white transition`}
                onClick={() => setTransformAnimation(!transformAnimation)}
              >
                {transformAnimation ? 'Hide Transformation' : 'Show Transformation'}
              </button>
              
              <div className="mt-2 text-sm text-blue-800">
                <p>Scale invariance means if y = f(x) is a solution, then y = λf(x/λ) is also a solution.</p>
                <p className="mt-1">For homogeneous ODEs, this property is what allows the u = y/x substitution to work!</p>
              </div>
            </div>
          )}
          
          {/* Initial condition input for trajectories */}
          {viewMode === 'phase' && (
            <div className="mb-4 p-3 bg-green-50 rounded">
              <h4 className="text-sm font-medium mb-2">Initial Condition:</h4>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label htmlFor="x0" className="block text-xs mb-1">x₀:</label>
                  <input
                    id="x0"
                    type="number"
                    value={x0}
                    onChange={(e) => setX0(parseFloat(e.target.value))}
                    className="w-full border rounded p-1 text-sm"
                    step="0.1"
                  />
                </div>
                <div>
                  <label htmlFor="y0" className="block text-xs mb-1">y₀:</label>
                  <input
                    id="y0"
                    type="number"
                    value={y0}
                    onChange={(e) => setY0(parseFloat(e.target.value))}
                    className="w-full border rounded p-1 text-sm"
                    step="0.1"
                  />
                </div>
              </div>
              
              <button 
                className="w-full py-1 px-3 rounded bg-green-600 hover:bg-green-700 text-white transition text-sm"
                onClick={() => setShowTrajectory(!showTrajectory)}
              >
                Add Trajectory
              </button>
              
              {trajectories.length > 0 && (
                <button 
                  className="w-full mt-1 py-1 px-3 rounded bg-red-500 hover:bg-red-600 text-white transition text-sm"
                  onClick={() => setTrajectories([])}
                >
                  Clear Trajectories
                </button>
              )}
              
              <div className="mt-2 text-xs text-green-800">
                <p>Add trajectories to see how solutions evolve from specific starting points.</p>
                <p className="mt-1">Uses 4th-order Runge-Kutta numerical integration.</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-2 flex items-center">
            {viewMode === 'solution' ? 'Solution Visualization' : 'Phase Plane'}
            <button 
              className="ml-2 w-5 h-5 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-sm"
              onMouseEnter={() => showInfoTooltip(viewMode === 'solution' ? 'solutionCurves' : 'phaseSpace')}
              onMouseLeave={hideInfoTooltip}
            >
              ?
            </button>
          </h3>
          
          <div className="border rounded bg-white">
            <svg ref={svgRef} width={width} height={height}></svg>
          </div>
          
          <div className="text-sm text-center mt-2">
            {viewMode === 'solution' 
              ? `Solution curves for y' = (y² + xy)/x² with highlighted C = ${constantValue}`
              : 'Phase plane showing direction field and sample trajectories'}
          </div>
        </div>
      </div>
      
      {/* Tooltip display */}
      {showTooltip && (
        <div 
          className="fixed bg-gray-800 text-white p-3 rounded shadow-lg max-w-xs z-10" 
          style={{ 
            left: '50%', 
            top: '50%', 
            transform: 'translate(-50%, -50%)' 
          }}
          role="tooltip"
          aria-live="polite"
        >
          {tooltips[showTooltip]}
        </div>
      )}
      
      {/* Substitution steps visualization */}
      {showSubstitution && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4">
          <h3 className="font-semibold mb-3 flex items-center">
            Substitution Method
            <button 
              className="ml-2 w-5 h-5 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-sm"
              onMouseEnter={() => showInfoTooltip('substitution')}
              onMouseLeave={hideInfoTooltip}
            >
              ?
            </button>
          </h3>
          
          {/* Interactive step controls */}
          <div className="flex mb-3">
            <button
              className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded-l transition"
              onClick={() => setStep(Math.max(0, step-1))}
              disabled={step === 0}
            >
              ← Previous
            </button>
            <div className="flex-1 bg-white border-t border-b border-gray-300 py-1 px-2 text-center">
              Step {step + 1} of {steps.length}
            </div>
            <button
              className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded-r transition"
              onClick={() => setStep(Math.min(steps.length-1, step+1))}
              disabled={step === steps.length-1}
            >
              Next →
            </button>
          </div>
          
          {/* Current step title */}
          <div className="bg-blue-100 p-2 rounded mb-3 text-blue-800 font-medium">
            {steps[step]}
          </div>
          
          {/* Animated substitution visualization */}
          <div className="mb-3 h-40 flex items-center justify-center bg-white rounded border p-2">
            {substitutionAnimations[step]}
          </div>
          
          {/* Detailed explanation */}
          <div className="bg-white p-3 rounded border text-sm whitespace-pre-line">
            {substitutionDetails[step]}
          </div>
        </div>
      )}
      
      <div className="bg-yellow-50 p-3 rounded mt-4">
        <h3 className="font-semibold mb-1">Key Insight:</h3>
        <p>
          Homogeneous ODEs have a special property: they remain unchanged when variables are scaled 
          proportionally. The u = y/x substitution exploits this invariance, transforming the equation 
          into a separable form that can be solved through integration.
        </p>
        <div className="mt-3 text-sm border-t border-yellow-200 pt-2">
          <p className="font-medium">Performance and Limitations Note:</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>This tool performs a numerical check for homogeneity using test points, not a symbolic mathematical proof</li>
            <li>Complex visualizations might perform differently across devices</li>
            <li>For advanced exploration, additional features like isoclines, user-defined initial conditions, and other ODE types could be implemented</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default HomogeneousODEExplorer;
