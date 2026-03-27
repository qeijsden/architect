const ok = async () => ({ data: null, error: null });

const chain = {
	eq: ok,
	select: () => ({ eq: ok, single: ok }),
	insert: () => ({ select: () => ({ single: ok }) }),
	update: () => ({ eq: ok }),
	delete: () => ({ eq: ok }),
};

export const supabase = {
	from: () => chain,
};
