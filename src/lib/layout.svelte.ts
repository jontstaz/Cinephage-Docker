export const layoutState = $state({
	isSidebarExpanded: true,
	toggleSidebar() {
		this.isSidebarExpanded = !this.isSidebarExpanded;
	}
});
