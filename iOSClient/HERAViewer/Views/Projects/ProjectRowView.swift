import SwiftUI

struct ProjectRowView: View {
    let project: ArProject

    var thumbnailURL: URL? {
        guard let pic = project.pictureUrl else { return nil }
        return URL(string: "\(AppSettings.shared.resourcesBaseURL)\(pic)")
    }

    var body: some View {
        HStack(spacing: 12) {
            AsyncImage(url: thumbnailURL) { phase in
                switch phase {
                case .success(let img):
                    img.resizable().aspectRatio(contentMode: .fill)
                default:
                    Color(.systemGray5)
                        .overlay(Image(systemName: "cube").foregroundStyle(.secondary))
                }
            }
            .frame(width: 56, height: 56)
            .clipShape(RoundedRectangle(cornerRadius: 8))

            VStack(alignment: .leading, spacing: 2) {
                Text(project.title).font(.headline)
                if let owner = project.owner {
                    Text(owner.username)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                if let count = project.sceneCount {
                    Text("\(count) scene\(count == 1 ? "" : "s")")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
            }

            Spacer()
            Image(systemName: "chevron.right")
                .foregroundStyle(.tertiary)
                .font(.caption)
        }
        .padding(.vertical, 4)
    }
}
