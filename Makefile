.PHONY: run add-visit

# Run the local server and open the map in the browser
run:
	@echo "Starting server at http://localhost:8000..."
	@cd site && python3 -m http.server 8000 & \
	sleep 1; \
	xdg-open http://localhost:8000; \
	wait

# Add a new visit or residency entry interactively
add-visit:
	@python3 add_visit.py
