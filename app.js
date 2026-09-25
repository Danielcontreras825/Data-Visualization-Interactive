(async function () {
  const data = await d3.json("data.json");
  const labels = {
    "Noise - Residential": "residential noise",
    "Noise - Street/Sidewalk": "street noise",
    "HEAT/HOT WATER": "heat or hot water",
    Rodent: "rodent"
  };
  const displayLabels = {
    "Noise - Residential": "Residential noise",
    "Noise - Street/Sidewalk": "Street noise",
    "HEAT/HOT WATER": "Heat / hot water",
    Rodent: "Rodents"
  };
  const pictures = {
    Brooklyn: ["scenes/brooklyn.webp", "the Brooklyn Bridge and DUMBO waterfront"],
    Manhattan: ["scenes/manhattan.webp", "Manhattan skyscrapers"],
    Queens: ["scenes/queens.webp", "a Queens street and elevated train"],
    Bronx: ["scenes/bronx.webp", "a Bronx street with an elevated train"],
    "Staten Island": ["scenes/staten-island.webp", "the Staten Island waterfront and ferry"],
    "All NYC": ["scenes/manhattan.webp", "the New York City skyline"]
  };
  const boroughOrder = ["All NYC", "Brooklyn", "Manhattan", "Queens", "Bronx", "Staten Island"];
  const state = { borough: "Brooklyn", problem: "Noise - Residential", day: 4, hour: 22 };
  const format = d3.format(",");
  const hourLabel = hour => hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`;
  const hourRange = hour => `${hourLabel(hour)} – ${hourLabel((hour + 1) % 24)}`;

  const dailyTotal = (borough, day) => borough === "All NYC"
    ? d3.sum(data.boroughs, name => data.counts[state.problem][name][day])
    : data.counts[state.problem][borough][day];

  const hourlyTotal = (borough, day, hour) => borough === "All NYC"
    ? d3.sum(data.boroughs, name => data.hourly[state.problem][name][day][hour])
    : data.hourly[state.problem][borough][day][hour];

  d3.select(".hour-ticks")
    .selectAll("span")
    .data(d3.range(24))
    .join("span")
    .attr("class", hour => hour % 6 === 0 ? "major" : null);
  d3.select("#problem").on("change", event => {
    state.problem = event.target.value;
    render();
  });
  d3.select("#hour").on("input", event => {
    state.hour = +event.target.value;
    render();
  });

  function render() {
    const { borough, problem, day, hour } = state;
    const regionText = borough === "All NYC" ? "across NYC" : `in ${borough}`;
    const selectedCount = hourlyTotal(borough, day, hour);
    const hourlySeries = d3.range(24).map(h => ({ hour: h, value: hourlyTotal(borough, day, h) }));
    const dailySeries = data.days.map((name, index) => ({ name, index, value: dailyTotal(borough, index) }));

    d3.select("#problem").property("value", problem);
    d3.select("#hour").property("value", hour);
    d3.select("#hour-display").text(hourRange(hour));
    d3.select("#scene-eyebrow").text(`${borough.toUpperCase()} / ${data.days[day].toUpperCase()}, SEPT ${15 + day}`);
    d3.select("#scene-title").text(
      hour >= 18 || hour < 5
        ? `${data.days[day]} night ${regionText}.`
        : `${data.days[day]} ${hour < 12 ? "morning" : "afternoon"} ${regionText}.`
    );
    d3.select("#scene-caption").text(`${displayLabels[problem]} requests filed between ${hourRange(hour).toLowerCase()}.`);
    d3.select("#clock").html(`${hour % 12 || 12}:00 <span>${hour < 12 ? "AM" : "PM"}</span>`);
    d3.select("#hour-count").text(format(selectedCount));
    d3.select("#reading-note").text(`${data.days[day]} · ${borough} · ${hourRange(hour)}`);
    d3.select("#scene").attr("aria-label", `Illustrated ${borough} scene. ${selectedCount} ${labels[problem]} requests filed ${data.days[day]} from ${hourRange(hour)}.`);

    const picture = pictures[borough];
    d3.select("#scene-art")
      .attr("src", picture[0])
      .attr("alt", `Illustration of ${picture[1]}`);

    const brightnessByHour = [
      .78, .76, .74, .73, .74, .79, .86, .94,
      1.01, 1.07, 1.12, 1.16, 1.18, 1.18, 1.16, 1.13,
      1.08, 1.02, .96, .90, .86, .83, .81, .79
    ];
    const saturationByHour = [
      1.18, 1.17, 1.16, 1.15, 1.15, 1.12, 1.09, 1.07,
      1.06, 1.05, 1.05, 1.05, 1.05, 1.05, 1.06, 1.07,
      1.09, 1.12, 1.17, 1.20, 1.21, 1.21, 1.20, 1.19
    ];
    const lightTint = hour < 5
      ? "linear-gradient(125deg,#10285a44,#66365a28)"
      : hour < 8
        ? "linear-gradient(125deg,#f4a46a42,#84c5e638)"
        : hour < 17
          ? "linear-gradient(130deg,#9dd9f033,#ffe3a82e)"
          : hour < 20
            ? "linear-gradient(125deg,#f0a05d48,#9e54703b)"
            : "linear-gradient(125deg,#10285a44,#66365a28)";
    d3.select("#scene")
      .style("--art-brightness", brightnessByHour[hour])
      .style("--art-saturation", saturationByHour[hour])
      .style("--light-tint", lightTint);

    const sharedWeekdayPeak = d3.max(
      d3.range(data.days.length),
      weekday => d3.max(
        d3.range(24),
        selectedHour => hourlyTotal(borough, weekday, selectedHour)
      )
    ) || 1;
    d3.select("#boroughs")
      .selectAll("button")
      .data(boroughOrder, d => d)
      .join("button")
      .attr("type", "button")
      .attr("class", d => d === borough ? "active" : null)
      .attr("aria-pressed", d => d === borough)
      .text(d => d)
      .on("click", (_, d) => { state.borough = d; render(); });

    d3.select("#days")
      .selectAll("button")
      .data(dailySeries, d => d.index)
      .join("button")
      .attr("type", "button")
      .attr("class", d => d.index === day ? "active" : null)
      .attr("aria-pressed", d => d.index === day)
      .attr("aria-label", d => `${d.name}, September ${15 + d.index}, ${format(d.value)} ${labels[problem]} requests`)
      .html(d => `<b>${d.name}</b><span>${15 + d.index} Sep</span>`)
      .on("click", (_, d) => { state.day = d.index; render(); });

    d3.select("#hour-chart-caption").text(`${displayLabels[problem]} by hour · ${borough} · ${data.days[day]}`);
    const hourHeight = d3.scaleLinear().domain([0, sharedWeekdayPeak]).range([2, 100]);
    d3.select("#hour-bars")
      .selectAll("button")
      .data(hourlySeries, d => d.hour)
      .join("button")
      .attr("type", "button")
      .attr("class", d => d.hour === hour ? "active" : null)
      .attr("aria-label", d => `${hourLabel(d.hour)}: ${d.value} ${labels[problem]} requests. Select hour.`)
      .attr("title", d => `${hourLabel(d.hour)} · ${format(d.value)} ${labels[problem]}`)
      .on("click", (_, d) => { state.hour = d.hour; render(); })
      .transition().duration(350)
      .style("height", d => `${hourHeight(d.value)}%`);

    d3.select("#week-chart-caption").text(`${displayLabels[problem]} totals by weekday · ${borough}`);
    const dailyScale = d3.scaleLinear().domain([0, d3.max(dailySeries, d => d.value) || 1]).range([0, 100]);
    const weekRows = d3.select("#week-bars")
      .selectAll("button")
      .data(dailySeries, d => d.index)
      .join(enter => {
        const button = enter.append("button").attr("type", "button").attr("class", "week-row");
        button.append("span").attr("class", "week-day");
        button.append("span").attr("class", "track").append("span").attr("class", "fill");
        button.append("strong");
        return button;
      })
      .attr("class", d => `week-row${d.index === day ? " active" : ""}`)
      .attr("aria-label", d => `${d.name}: ${format(d.value)} ${labels[problem]} requests. Select day.`)
      .on("click", (_, d) => { state.day = d.index; render(); });
    weekRows.select(".week-day").text(d => d.name);
    weekRows.select("strong").text(d => format(d.value));
    weekRows.select(".fill").transition().duration(350).style("width", d => `${dailyScale(d.value)}%`);

  }

  render();
})().catch(error => {
  console.error(error);
  d3.select("#scene-title").text("The request data could not load.");
});
