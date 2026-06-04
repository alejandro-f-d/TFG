// components/common/FilterableList.tsx
import { useState, useEffect, useCallback } from "react";

interface Pagination {
	totalItems: number;
	totalPages: number;
	currentPage: number;
}

interface FilterableListProps<T> {
	fetchData: (
		page: number,
		limit: number,
		filter: string,
	) => Promise<{ items: T[]; pagination: Pagination }>;
	renderItem: (item: T, index: number) => React.ReactNode;
	placeholder?: string;
	emptyMessage?: string;
	limit?: number;
	itemKey?: (item: T) => string | number;
}

export function FilterableList<T>({
	fetchData,
	renderItem,
	placeholder = "Buscar...",
	emptyMessage = "No se encontraron resultados.",
	limit = 5,
	itemKey,
}: FilterableListProps<T>) {
	const [items, setItems] = useState<T[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [pagination, setPagination] = useState<Pagination>({
		totalItems: 0,
		totalPages: 0,
		currentPage: 1,
	});
	const [filter, setFilter] = useState("");
	const [debouncedFilter, setDebouncedFilter] = useState("");

	useEffect(() => {
		const handler = setTimeout(() => setDebouncedFilter(filter), 500);
		return () => clearTimeout(handler);
	}, [filter]);

	const loadData = useCallback(
		async (page: number, filterValue: string) => {
			setLoading(true);
			setError("");
			try {
				const { items: newItems, pagination: newPagination } = await fetchData(
					page,
					limit,
					filterValue,
				);
				setItems(newItems);
				setPagination(newPagination);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Error al cargar datos");
			} finally {
				setLoading(false);
			}
		},
		[fetchData, limit],
	);

	useEffect(() => {
		loadData(1, debouncedFilter);
	}, [debouncedFilter, loadData]);

	const handlePageChange = (newPage: number) => {
		if (newPage < 1 || newPage > pagination.totalPages) return;
		loadData(newPage, debouncedFilter);
	};

	const clearFilter = () => {
		setFilter("");
		setDebouncedFilter("");
	};

	if (loading) {
		return (
			<div className="flex justify-center py-8">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
			</div>
		);
	}

	if (error) {
		return <div className="text-center py-8 text-red-600">{error}</div>;
	}

	const noResults = items.length === 0;

	return (
		<div className="space-y-6">
			<div className="relative">
				<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
					<svg
						className="h-5 w-5 text-gray-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						/>
					</svg>
				</div>
				<input
					type="text"
					placeholder={placeholder}
					value={filter}
					onChange={(e) => setFilter(e.target.value)}
					className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition"
				/>
			</div>

			{noResults && (
				<div className="text-center py-12 bg-white rounded-xl shadow-sm">
					<p className="text-gray-500">
						{emptyMessage}
						{filter && ` que coincidan con "${filter}"`}
					</p>
					{filter && (
						<button
							onClick={clearFilter}
							className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center"
						>
							<svg
								className="w-4 h-4 mr-1"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
							Limpiar búsqueda y ver todos
						</button>
					)}
				</div>
			)}

			{!noResults && (
				<>
					<div className="grid gap-4">
						{items.map((item, idx) => renderItem(item, idx))}
					</div>
					{pagination.totalPages > 1 && (
						<div className="flex justify-center space-x-2">
							<button
								onClick={() => handlePageChange(pagination.currentPage - 1)}
								disabled={pagination.currentPage === 1}
								className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-100"
							>
								Anterior
							</button>
							<span className="px-3 py-1">
								Página {pagination.currentPage} de {pagination.totalPages}
							</span>
							<button
								onClick={() => handlePageChange(pagination.currentPage + 1)}
								disabled={pagination.currentPage === pagination.totalPages}
								className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-100"
							>
								Siguiente
							</button>
						</div>
					)}
				</>
			)}
		</div>
	);
}
